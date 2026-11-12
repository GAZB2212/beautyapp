-- Access rule tests (pgTAP). Each block signs in as a different kind of user and checks
-- what they can and cannot do. Run with `supabase test db`, or locally: scripts/test-db.sh
begin;
create extension if not exists pgtap with schema extensions;
-- Functions are closed by default (see the access rules migration), so the test helpers
-- must be opened explicitly to the roles the tests impersonate. Rolled back with the test.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    join pg_extension e on e.oid = d.refobjid and e.extname = 'pgtap'
    where not has_function_privilege('anon', p.oid, 'execute')
  loop
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures (created as the database owner, bypassing RLS)
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to public;
-- A Monday two to three weeks from now, in salon-local time
create function tests.monday() returns date language sql stable as
  $$ select (date_trunc('week', now() at time zone 'Europe/London') + interval '14 days')::date $$;
create function tests.at(t time) returns timestamptz language sql stable as
  $$ select (tests.monday() + t) at time zone 'Europe/London' $$;
grant execute on all functions in schema tests to public;

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'owner-a@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'manager-a@example.com'),
  ('10000000-0000-0000-0000-000000000003', 'staff-a@example.com'),
  ('10000000-0000-0000-0000-000000000004', 'owner-b@example.com'),
  ('10000000-0000-0000-0000-000000000005', 'outsider@example.com');

-- (settings, branding and Stripe rows are created automatically with each salon)
insert into public.salons (id, slug, name, status, stripe_charges_enabled) values
  ('a0000000-0000-0000-0000-000000000000', 'salon-a', 'Salon A', 'active', true),
  ('b0000000-0000-0000-0000-000000000000', 'salon-b', 'Salon B', 'active', true),
  ('c0000000-0000-0000-0000-000000000000', 'salon-c', 'Salon C', 'onboarding', false);
update public.salon_settings set slot_interval_min = 30;
update public.salon_branding set tagline = 'A tagline';
update public.salon_stripe set stripe_account_id = 'acct_secret' || left(salon_id::text, 1),
                               stripe_customer_id = 'cus_secret' || left(salon_id::text, 1);
insert into public.salon_members (salon_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('a0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'manager'),
  ('a0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'staff'),
  ('b0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'owner'),
  ('c0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'owner');
insert into public.salon_hours (salon_id, weekday, opens_at, closes_at) values
  ('a0000000-0000-0000-0000-000000000000', 1, '09:00', '17:00'),
  ('b0000000-0000-0000-0000-000000000000', 1, '09:00', '17:00');

insert into public.staff (id, salon_id, name, is_bookable) values
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Anna', true),
  ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Abby', true),
  ('a3000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Hidden junior', false),
  ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Bella', true);
-- Abby keeps her own short hours; Anna follows the salon's opening hours
insert into public.staff_hours (salon_id, staff_id, weekday, starts_at, ends_at) values
  ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000', 1, '12:00', '14:00');

insert into public.services (id, salon_id, name, duration_min, buffer_after_min, price_pence, active, online_bookable) values
  ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Cut', 60, 15, 4800, true, true),
  ('a5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'Retired service', 60, 0, 1000, false, true),
  ('a5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'Phone-only service', 60, 0, 1000, true, false),
  ('b5000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', 'B Cut', 60, 0, 5000, true, true);
insert into public.staff_services (salon_id, staff_id, service_id) values
  ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000000', 'a3000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'b5000000-0000-0000-0000-000000000001');

insert into public.clients (id, salon_id, first_name, phone) values
  ('ac000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Alice', '+447700900001'),
  ('bc000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Bea', '+447700900002');

insert into public.bookings (id, salon_id, client_id, staff_id, starts_at, ends_at, buffer_after_min, status, source, deposit_pence) values
  ('ab000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'ac000000-0000-0000-0000-000000000000',
   'a1000000-0000-0000-0000-000000000000', tests.at('10:00'), tests.at('11:00'), 15, 'confirmed', 'online', 1000),
  ('bb000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'bc000000-0000-0000-0000-000000000000',
   'b1000000-0000-0000-0000-000000000000', tests.at('10:00'), tests.at('11:00'), 0, 'confirmed', 'online', 0);
-- Salon A is closed to everyone 15:00–16:00 that day
insert into public.blocks (salon_id, staff_id, starts_at, ends_at) values
  ('a0000000-0000-0000-0000-000000000000', null, tests.at('15:00'), tests.at('16:00'));
insert into public.client_stripe (client_id, salon_id, stripe_customer_id) values
  ('ac000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'cus_secretAlice');
insert into public.blocks (salon_id, staff_id, starts_at, ends_at) values
  ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', tests.at('14:00'), tests.at('15:00'));
insert into public.booking_items (salon_id, booking_id, service_id, service_name, duration_min, price_pence, starts_at, ends_at) values
  ('b0000000-0000-0000-0000-000000000000', 'bb000000-0000-0000-0000-000000000000', 'b5000000-0000-0000-0000-000000000001', 'B Cut', 60, 5000, tests.at('10:00'), tests.at('11:00'));
insert into public.booking_events (salon_id, booking_id, type) values
  ('b0000000-0000-0000-0000-000000000000', 'bb000000-0000-0000-0000-000000000000', 'created');
insert into public.notifications (salon_id, booking_id, channel, template, recipient) values
  ('b0000000-0000-0000-0000-000000000000', 'bb000000-0000-0000-0000-000000000000', 'sms', 'confirmation', '+447700900002');
insert into public.payments (salon_id, booking_id, client_id, kind, amount_pence, status) values
  ('a0000000-0000-0000-0000-000000000000', 'ab000000-0000-0000-0000-000000000000', 'ac000000-0000-0000-0000-000000000000', 'deposit', 1000, 'succeeded'),
  ('b0000000-0000-0000-0000-000000000000', 'bb000000-0000-0000-0000-000000000000', 'bc000000-0000-0000-0000-000000000000', 'deposit', 500, 'succeeded');

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity), 0::bigint,
  'every table has row level security switched on');

select is(
  (select count(*) from public.salon_settings) + (select count(*) from public.salon_branding) + (select count(*) from public.salon_stripe),
  9::bigint, 'every salon gets its settings, branding and Stripe rows automatically');
select is(
  (select count(*) from public.booking_access), (select count(*) from public.bookings),
  'every booking gets a private manage link');

select set_eq(
  $$ select p.proname::text from pg_proc p
     where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute') $$,
  array['get_storefront', 'get_availability', 'book_appointment'],
  'the public can call exactly three functions');
select set_eq(
  $$ select p.proname::text from pg_proc p
     where p.pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', p.oid, 'execute') $$,
  array['get_storefront', 'get_availability', 'book_appointment',
        'create_salon', 'slug_status', 'accept_invites', 'set_salon_published'],
  'signed-in users can additionally call only the sign-up, invite and publish functions');

-- Anything added later starts closed
create function public.future_function() returns int language sql security definer as 'select 1';
create table public.future_table (id int);
select ok(not has_function_privilege('anon', 'public.future_function()', 'execute'), 'a new function is not callable by the public');
select ok(not has_function_privilege('authenticated', 'public.future_function()', 'execute'), 'a new function is not callable by signed-in users');
select ok(not has_table_privilege('anon', 'public.future_table', 'select'), 'a new table is not readable by the public');
select ok(not has_table_privilege('authenticated', 'public.future_table', 'select'), 'a new table is not readable by signed-in users');
drop function public.future_function();
drop table public.future_table;

select ok(not has_function_privilege('anon', 'app.salon_ids(public.member_role)', 'execute'),
  'the public cannot call the membership helper');

-- ---------------------------------------------------------------------------
-- Public visitor (not signed in)
-- ---------------------------------------------------------------------------
set local role anon;

select throws_ok(format('select 1 from public.%I limit 1', tablename), '42501', null,
                 'public cannot read table ' || tablename)
from pg_tables where schemaname = 'public' order by tablename;

select throws_ok(format('delete from public.%I', tablename), '42501', null,
                 'public cannot delete from table ' || tablename)
from pg_tables where schemaname = 'public' order by tablename;
select throws_ok(format('insert into public.%I default values', tablename), '42501', null,
                 'public cannot insert into table ' || tablename)
from pg_tables where schemaname = 'public' order by tablename;

select is(public.get_storefront('salon-a') -> 'salon' ->> 'name', 'Salon A', 'public can load a live salon page');
select is(public.get_storefront('SALON-A') -> 'salon' ->> 'name', 'Salon A', 'slug lookup ignores case');
select is(public.get_storefront('salon-c'), null, 'a salon that is not live yet is hidden from the public');
select is(public.get_storefront('does-not-exist'), null, 'unknown slug returns nothing');
select ok(public.get_storefront('salon-a')::text !~ '(acct_|cus_|secret|token)', 'salon page never includes Stripe identifiers or tokens');
select ok(public.get_storefront('salon-a')::text !~ '(Alice|\+4477)', 'salon page never includes client data');
select is(jsonb_array_length(public.get_storefront('salon-a') -> 'services'), 1, 'only active, online-bookable services are listed');
select is(jsonb_array_length(public.get_storefront('salon-a') -> 'staff'), 2, 'only bookable stylists are listed');
select is(jsonb_array_length(public.get_storefront('salon-a') -> 'services' -> 0 -> 'staff_ids'), 2,
  'a service lists only its bookable stylists');
select is(public.get_storefront('salon-a') -> 'salon' ->> 'online_payments', 'true', 'page knows whether deposits can be taken');

-- Availability. Anna: 09:00–17:00, booked 10:00–11:00 (+15 min clean-down), salon blocked 15:00–16:00.
-- A 60 min cut with 15 min clean-down, 30 min slot grid.
select results_eq(
  $$ select to_char(starts_at at time zone 'Europe/London', 'HH24:MI')
     from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', tests.monday(), 1, 'a1000000-0000-0000-0000-000000000000') $$,
  array['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '16:00'],
  'free slots respect bookings, clean-down time, blocked time and opening hours');
select results_eq(
  $$ select to_char(starts_at at time zone 'Europe/London', 'HH24:MI')
     from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', tests.monday(), 1, 'a2000000-0000-0000-0000-000000000000') $$,
  array['12:00', '12:30', '13:00'],
  'a stylist with their own hours is only offered within them');
select is(
  (select count(*) from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', tests.monday(), 1)),
  10::bigint, '"any stylist" returns slots for every bookable stylist, and none for hidden ones');
select is_empty(
  $$ select 1 from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000002', tests.monday(), 7) $$,
  'no slots for a retired service');
select is_empty(
  $$ select 1 from public.get_availability('salon-a', 'b5000000-0000-0000-0000-000000000001', tests.monday(), 7) $$,
  'no slots when the service belongs to a different salon');
select is_empty(
  $$ select 1 from public.get_availability('salon-c', 'a5000000-0000-0000-0000-000000000001', tests.monday(), 7) $$,
  'no slots for a salon that is not live');
select is_empty(
  $$ select 1 from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', (now() - interval '10 days')::date, 5) $$,
  'no slots in the past');

select is(
  (select count(distinct (starts_at at time zone 'Europe/London')::date)
   from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', null, 1)) <= 1, true,
  'a missing start date cannot be used to fetch more than the days asked for');
select ok(
  (select count(distinct (starts_at at time zone 'Europe/London')::date)
   from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', tests.monday(), 100000)) <= 31,
  'one request never covers more than 31 days');

-- Unpaid holds: block the slot while live, release it once expired
reset role;
insert into public.bookings (id, salon_id, staff_id, starts_at, ends_at, buffer_after_min, status, hold_expires_at) values
  ('ab000000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000',
   tests.at('12:00'), tests.at('13:00'), 15, 'pending_payment', now() + interval '10 minutes');
set local role anon;
select is_empty(
  $$ select 1 from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', tests.monday(), 1, 'a2000000-0000-0000-0000-000000000000') $$,
  'a slot being paid for is held');
reset role;
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = 'ab000000-0000-0000-0000-000000000099';
set local role anon;
select is(
  (select count(*) from public.get_availability('salon-a', 'a5000000-0000-0000-0000-000000000001', tests.monday(), 1, 'a2000000-0000-0000-0000-000000000000')),
  3::bigint, 'an expired hold frees the slot again');
reset role;
delete from public.bookings where id = 'ab000000-0000-0000-0000-000000000099';

-- ---------------------------------------------------------------------------
-- Signed in, but not a member of any salon
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "10000000-0000-0000-0000-000000000005"}';

select is_empty('select 1 from public.salons', 'outsider sees no salons');
select is_empty('select 1 from public.bookings', 'outsider sees no bookings');
select is_empty('select 1 from public.clients', 'outsider sees no clients');
select is_empty('select 1 from public.salon_members', 'outsider sees no team members');
select is(public.get_storefront('salon-c'), null, 'outsider cannot preview an unpublished salon');
select throws_ok(
  $$ insert into public.salons (slug, name) values ('sneaky', 'Sneaky') $$,
  '42501', null, 'salons cannot be created directly');
select throws_ok(
  $$ insert into public.salon_members (salon_id, role, invited_email)
     values ('a0000000-0000-0000-0000-000000000000', 'owner', 'outsider@example.com') $$,
  '42501', null, 'outsider cannot add themselves to a salon');

-- ---------------------------------------------------------------------------
-- Staff at salon A
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "10000000-0000-0000-0000-000000000003"}';

select results_eq('select name from public.salons', array['Salon A'], 'staff see only their own salon');
select results_eq('select first_name from public.clients', array['Alice'], 'staff see only their salon''s clients');
select is_empty($$ select 1 from public.bookings where salon_id <> 'a0000000-0000-0000-0000-000000000000' $$,
  'staff see no other salon''s bookings');
select isnt_empty('select 1 from public.bookings', 'staff see their salon''s diary');
select is((select count(*) from public.salon_members), 1::bigint, 'staff see only their own membership');
select is_empty('select 1 from public.payments', 'staff cannot see payment records');
select is_empty('select 1 from public.client_payment_methods', 'staff cannot see saved cards');
select is_empty('select 1 from public.subscriptions', 'staff cannot see the subscription');
select throws_ok('select 1 from public.stripe_events', '42501', null, 'staff cannot read Stripe events');
select throws_ok('select 1 from public.salon_stripe', '42501', null, 'staff cannot read the salon''s Stripe account ids');
select throws_ok('select 1 from public.client_stripe', '42501', null, 'staff cannot read clients'' Stripe ids');
select throws_ok('select 1 from public.booking_access', '42501', null, 'staff cannot read clients'' manage links');

-- Nothing of salon B is visible, table by table
select is_empty(format($f$ select 1 from public.%I where salon_id = 'b0000000-0000-0000-0000-000000000000' $f$, t),
                'staff see nothing of another salon in ' || t)
from unnest(array['salon_settings', 'salon_branding', 'salon_hours', 'salon_members', 'staff', 'staff_hours',
                  'service_categories', 'services', 'staff_services', 'blocks', 'clients', 'bookings',
                  'booking_items', 'booking_events', 'notifications', 'payments']) t;

select lives_ok(
  $$ insert into public.bookings (salon_id, client_id, staff_id, starts_at, ends_at, status, source)
     values ('a0000000-0000-0000-0000-000000000000', 'ac000000-0000-0000-0000-000000000000',
             'a1000000-0000-0000-0000-000000000000', tests.at('13:00'), tests.at('14:00'), 'confirmed', 'walk_in') $$,
  'staff can add a walk-in');
select is(
  (select created_by from public.bookings where source = 'walk_in'),
  '10000000-0000-0000-0000-000000000003'::uuid, 'the booking records who created it');
select throws_ok(
  $$ insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, source)
     values ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', tests.at('13:30'), tests.at('14:30'), 'confirmed', 'dashboard') $$,
  '23P01', null, 'a stylist cannot be double-booked');
select throws_ok(
  $$ insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, source)
     values ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', tests.at('13:00'), tests.at('14:00'), 'confirmed', 'dashboard') $$,
  '42501', null, 'staff cannot create a booking in another salon');
select throws_ok(
  $$ insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, source)
     values ('a0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', tests.at('16:00'), tests.at('17:00'), 'confirmed', 'dashboard') $$,
  '23503', null, 'a booking cannot point at another salon''s stylist');
select throws_ok(
  $$ insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, source)
     values ('a0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', tests.at('10:30'), tests.at('10:45'), 'confirmed', 'dashboard') $$,
  '23503', null, 'and the error is the same when that stylist is busy, so their diary cannot be probed');
select throws_ok(
  $$ update public.bookings set staff_id = 'b1000000-0000-0000-0000-000000000000' where id = 'ab000000-0000-0000-0000-000000000000' $$,
  '23503', null, 'a booking cannot be reassigned to another salon''s stylist');
select throws_ok(
  $$ insert into public.bookings (salon_id, client_id, staff_id, starts_at, ends_at, status, source)
     values ('a0000000-0000-0000-0000-000000000000', 'bc000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', tests.at('16:00'), tests.at('17:00'), 'confirmed', 'dashboard') $$,
  '23503', null, 'a booking cannot point at another salon''s client');
select throws_ok(
  $$ insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, source)
     values ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', tests.at('16:00'), tests.at('17:00'), 'confirmed', 'online') $$,
  '42501', null, 'staff cannot fake an online booking');
select throws_ok(
  $$ insert into public.bookings (id, salon_id, staff_id, starts_at, ends_at, status, source)
     values (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', tests.at('16:00'), tests.at('17:00'), 'confirmed', 'dashboard') $$,
  '42501', null, 'staff cannot choose a booking''s internal id');
select throws_ok(
  $$ insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, source, deposit_pence)
     values ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', tests.at('16:00'), tests.at('17:00'), 'confirmed', 'dashboard', 5000) $$,
  '42501', null, 'staff cannot set deposit amounts');

select isnt_empty(
  $$ update public.bookings set internal_note = 'prefers tea' where id = 'ab000000-0000-0000-0000-000000000000' returning 1 $$,
  'staff can edit a booking in their salon');
select isnt_empty(
  $$ update public.bookings set status = 'cancelled', cancelled_by = 'salon', cancelled_at = now()
     where source = 'walk_in' returning 1 $$,
  'staff can cancel a booking');
select is_empty(
  $$ update public.bookings set internal_note = 'x' where id = 'bb000000-0000-0000-0000-000000000000' returning 1 $$,
  'staff cannot edit another salon''s booking');
select throws_ok(
  $$ update public.bookings set deposit_pence = 0 where id = 'ab000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'staff cannot change a deposit');
select throws_ok(
  $$ update public.bookings set salon_id = 'b0000000-0000-0000-0000-000000000000' where id = 'ab000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'a booking cannot be moved to another salon');
select throws_ok(
  $$ update public.bookings set deposit_paid_at = now() where id = 'ab000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'staff cannot mark a deposit as paid');
select throws_ok(
  $$ update public.bookings set status = 'cancelled', cancelled_by = 'client' where id = 'ab000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'staff cannot record a cancellation as made by the client');
select throws_ok(
  $$ delete from public.bookings where id = 'ab000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'bookings are never deleted, only cancelled');

select lives_ok(
  $$ insert into public.clients (salon_id, first_name, email, source) values ('a0000000-0000-0000-0000-000000000000', 'Cara', 'cara@example.com', 'dashboard') $$,
  'staff can add a client');
select throws_ok(
  $$ insert into public.clients (salon_id, first_name, email, source) values ('a0000000-0000-0000-0000-000000000000', 'Dana', 'dana@example.com', 'online') $$,
  '42501', null, 'staff cannot record a client as having booked online');
select isnt_empty(
  $$ update public.clients set notes = 'Patch test done' where id = 'ac000000-0000-0000-0000-000000000000' returning 1 $$,
  'staff can add client notes');
select throws_ok(
  $$ insert into public.clients (salon_id, first_name, email, source) values ('b0000000-0000-0000-0000-000000000000', 'Mallory', 'm@example.com', 'dashboard') $$,
  '42501', null, 'staff cannot add a client to another salon');
select throws_ok(
  $$ delete from public.clients where id = 'ac000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'staff cannot delete clients');

reset role;
insert into public.bookings (id, salon_id, staff_id, starts_at, ends_at, status, source, deposit_pence, hold_expires_at) values
  ('ab000000-0000-0000-0000-000000000077', 'a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000',
   tests.at('12:00'), tests.at('13:00'), 'pending_payment', 'online', 1000, now() + interval '10 minutes');
set local role authenticated;
set local request.jwt.claims to '{"sub": "10000000-0000-0000-0000-000000000003"}';
select throws_ok(
  $$ update public.bookings set status = 'confirmed' where id = 'ab000000-0000-0000-0000-000000000077' $$,
  '42501', null, 'staff cannot confirm a booking whose deposit has not been paid');
reset role;
delete from public.bookings where id = 'ab000000-0000-0000-0000-000000000077';
set local role authenticated;
set local request.jwt.claims to '{"sub": "10000000-0000-0000-0000-000000000003"}';

select lives_ok(
  $$ insert into public.blocks (salon_id, staff_id, starts_at, ends_at, reason)
     values ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', tests.at('16:00'), tests.at('16:30'), 'Lunch') $$,
  'staff can block out time');

select is_empty(
  $$ update public.services set price_pence = 1 where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'staff cannot change prices');
select throws_ok(
  $$ insert into public.services (salon_id, name, duration_min, price_pence) values ('a0000000-0000-0000-0000-000000000000', 'Free cut', 30, 0) $$,
  '42501', null, 'staff cannot add services');
select is_empty(
  $$ update public.salon_branding set tagline = 'hacked' where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'staff cannot change branding');
select is_empty(
  $$ update public.salons set name = 'Renamed' returning 1 $$, 'staff cannot rename the salon');
select is_empty(
  $$ update public.salon_members set role = 'owner' returning 1 $$, 'staff cannot promote themselves');

-- ---------------------------------------------------------------------------
-- Manager at salon A
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "10000000-0000-0000-0000-000000000002"}';

select isnt_empty(
  $$ update public.services set price_pence = 5000 where id = 'a5000000-0000-0000-0000-000000000001' returning 1 $$,
  'manager can change prices');
select is_empty(
  $$ update public.services set price_pence = 1 where id = 'b5000000-0000-0000-0000-000000000001' returning 1 $$,
  'manager cannot change another salon''s prices');
select lives_ok(
  $$ insert into public.staff (salon_id, name) values ('a0000000-0000-0000-0000-000000000000', 'New starter') $$,
  'manager can add a stylist');
select throws_ok(
  $$ insert into public.staff (salon_id, name) values ('b0000000-0000-0000-0000-000000000000', 'Plant') $$,
  '42501', null, 'manager cannot add a stylist to another salon');
select throws_ok(
  $$ update public.staff set user_id = '10000000-0000-0000-0000-000000000005' where id = 'a1000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'manager cannot attach a login to a stylist directly');
select throws_ok(
  $$ insert into public.staff_services (salon_id, staff_id, service_id)
     values ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'b5000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'a stylist cannot be linked to another salon''s service');
select isnt_empty(
  $$ update public.salon_branding set tagline = 'Fresh' where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'manager can change branding');
select isnt_empty(
  $$ update public.salon_hours set closes_at = '18:00' where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'manager can change opening hours');
select is((select count(*) from public.salon_members), 3::bigint, 'manager sees the whole team');
select is_empty(
  $$ update public.salon_settings set deposit_value = 0 where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'manager cannot change deposit rules');
select is_empty('select 1 from public.payments', 'manager cannot see payment records');
select throws_ok(
  $$ insert into public.salon_members (salon_id, role, invited_email) values ('a0000000-0000-0000-0000-000000000000', 'manager', 'friend@example.com') $$,
  '42501', null, 'manager cannot invite team members');
select throws_ok(
  $$ delete from public.clients where first_name = 'Cara' $$, '42501', null,
  'manager cannot delete a client (and with them saved cards and payment history)');
select throws_ok(
  $$ update public.services set deposit_override_pence = 0 where id = 'a5000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'manager cannot change a service''s deposit');
select throws_ok(
  $$ insert into public.services (salon_id, name, duration_min, price_pence, deposit_override_pence)
     values ('a0000000-0000-0000-0000-000000000000', 'No-deposit colour', 120, 9000, 0) $$,
  '42501', null, 'manager cannot add a service with its own deposit rule');
select lives_ok(
  $$ insert into public.services (salon_id, name, duration_min, price_pence)
     values ('a0000000-0000-0000-0000-000000000000', 'Fringe trim', 15, 800) $$,
  'manager can add an ordinary service');
select throws_ok(
  $$ update public.services set id = gen_random_uuid() where id = 'a5000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'manager cannot rewrite record ids');
select is_empty(
  $$ update public.salon_members set role = 'owner' where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'manager cannot change anyone''s role');
select is_empty(
  $$ delete from public.salon_members where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'manager cannot remove team members');
select throws_ok(
  $$ update public.salon_branding set website = 'javascript:alert(1)' where salon_id = 'a0000000-0000-0000-0000-000000000000' $$,
  '23514', null, 'a website link must be a real web address');
select throws_ok(
  $$ update public.salon_branding set logo_path = 'b0000000-0000-0000-0000-000000000000/logo.png' where salon_id = 'a0000000-0000-0000-0000-000000000000' $$,
  '23514', null, 'a salon cannot use files from another salon''s folder');
select lives_ok(
  $$ update public.salon_branding set logo_path = 'a0000000-0000-0000-0000-000000000000/logo.png', website = 'https://example.com'
     where salon_id = 'a0000000-0000-0000-0000-000000000000' $$,
  'manager can set a logo from the salon''s own folder');

-- ---------------------------------------------------------------------------
-- Owner of salon A
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "10000000-0000-0000-0000-000000000001"}';

select results_eq('select amount_pence from public.payments', array[1000], 'owner sees only their own salon''s payments');
select isnt_empty(
  $$ update public.salon_settings set deposit_type = 'fixed', deposit_value = 1500
     where salon_id = 'a0000000-0000-0000-0000-000000000000' returning 1 $$,
  'owner can change deposit rules');
select is_empty(
  $$ update public.salon_settings set deposit_value = 0 where salon_id = 'b0000000-0000-0000-0000-000000000000' returning 1 $$,
  'owner cannot change another salon''s rules');
select isnt_empty($$ update public.salons set name = 'Salon A Studio' returning 1 $$, 'owner can rename their salon');
select results_eq('select name from public.salons', array['Salon A Studio'], 'the rename touched only their salon');
select throws_ok(
  $$ update public.salon_stripe set stripe_account_id = 'acct_attacker' $$, '42501', null,
  'owner cannot repoint payouts to another Stripe account');
select throws_ok(
  $$ update public.salons set stripe_charges_enabled = true $$, '42501', null,
  'owner cannot switch on payments without Stripe''s say-so');
select isnt_empty(
  $$ update public.services set deposit_override_pence = 2000 where id = 'a5000000-0000-0000-0000-000000000001' returning 1 $$,
  'owner can set a service''s deposit');
select throws_ok(
  $$ update public.salons set timezone = 'Mars/Olympus' $$, '22023', null, 'the salon time zone must be a real one');
select throws_ok(
  $$ update public.salon_settings set deposit_type = 'percent', deposit_value = 250 where salon_id = 'a0000000-0000-0000-0000-000000000000' $$,
  '23514', null, 'a percentage deposit cannot exceed 100%');
select throws_ok(
  $$ update public.salons set status = 'active' $$, '42501', null, 'owner cannot change the salon''s account status');
select throws_ok(
  $$ update public.salons set slug = 'salon-b2' $$, '42501', null, 'the salon link cannot be changed directly');
select throws_ok(
  $$ insert into public.payments (salon_id, kind, amount_pence, status) values ('a0000000-0000-0000-0000-000000000000', 'refund', 1000, 'succeeded') $$,
  '42501', null, 'owner cannot write payment records');
select lives_ok(
  $$ insert into public.salon_members (salon_id, role, invited_email) values ('a0000000-0000-0000-0000-000000000000', 'staff', 'new@example.com') $$,
  'owner can invite a team member');
select throws_ok(
  $$ insert into public.salon_members (salon_id, user_id, role) values ('a0000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'staff') $$,
  '42501', null, 'owner cannot add an account without that person accepting');
select throws_ok(
  $$ insert into public.salon_members (salon_id, role, invited_email) values ('b0000000-0000-0000-0000-000000000000', 'owner', 'owner-a@example.com') $$,
  '42501', null, 'owner cannot invite into another salon');
select isnt_empty(
  $$ update public.salon_members set role = 'manager' where user_id = '10000000-0000-0000-0000-000000000003' returning 1 $$,
  'owner can promote staff');
select throws_ok(
  $$ update public.salon_members set role = 'staff' where user_id = '10000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'the last owner cannot demote themselves');
select throws_ok(
  $$ delete from public.salon_members where user_id = '10000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'the last owner cannot be removed');
select isnt_empty(
  $$ delete from public.salon_members where user_id = '10000000-0000-0000-0000-000000000003' returning 1 $$,
  'owner can remove a team member');

-- ---------------------------------------------------------------------------
-- Owner of salons B and C
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "10000000-0000-0000-0000-000000000004"}';

select is_empty($$ select 1 from public.bookings where salon_id = 'a0000000-0000-0000-0000-000000000000' $$,
  'another salon''s owner sees none of salon A''s bookings');
select is_empty($$ select 1 from public.clients where salon_id = 'a0000000-0000-0000-0000-000000000000' $$,
  'another salon''s owner sees none of salon A''s clients');
select is((select count(*) from public.salons), 2::bigint, 'an owner of two salons sees both');
select is(public.get_storefront('salon-c') -> 'salon' ->> 'name', 'Salon C', 'an owner can preview their unpublished salon');

-- ---------------------------------------------------------------------------
-- Housekeeping (as the database owner)
-- ---------------------------------------------------------------------------
reset role;
select throws_ok(
  $$ delete from auth.users where id = '10000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'an account that is a salon''s only owner cannot be deleted from under it');
select lives_ok(
  $$ delete from public.salons where id = 'b0000000-0000-0000-0000-000000000000' $$,
  'a salon and everything in it can be deleted by the server');
select is_empty($$ select 1 from public.bookings where salon_id = 'b0000000-0000-0000-0000-000000000000' $$,
  'deleting a salon removes its bookings');

select * from finish();
rollback;

-- Sign-up, invites, publishing and online booking (pgTAP).
begin;
create extension if not exists pgtap with schema extensions;
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

create schema tests;
grant usage on schema tests to public;
create function tests.monday() returns date language sql stable as
  $$ select (date_trunc('week', now() at time zone 'Europe/London') + interval '14 days')::date $$;
create function tests.at(t time, plus_days int default 0) returns timestamptz language sql stable as
  $$ select (tests.monday() + plus_days + t) at time zone 'Europe/London' $$;
-- Results the anonymous visitor got back, readable later by the test itself
create table tests.results (name text primary key, body jsonb);
grant all on tests.results to public;
grant execute on all functions in schema tests to public;

insert into auth.users (id, email, email_confirmed_at) values
  ('20000000-0000-0000-0000-000000000001', 'sarah@example.com', now()),
  ('20000000-0000-0000-0000-000000000002', 'Amelia@Example.com', now()),
  ('20000000-0000-0000-0000-000000000003', 'unverified@example.com', null),
  ('20000000-0000-0000-0000-000000000004', 'stranger@example.com', now());

-- ---------------------------------------------------------------------------
-- Sign-up
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims to '';
select throws_ok($$ select public.create_salon('Nope', 'nope-salon') $$, '42501', null, 'the public cannot create a salon');
select throws_ok($$ select public.accept_invites() $$, '42501', null, 'the public cannot accept invites');
select throws_ok($$ select public.slug_status('anything') $$, '42501', null, 'the public cannot probe salon links');

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000003"}';
select throws_ok($$ select public.create_salon('Unverified', 'unverified-salon') $$, 'P0001', 'email_not_verified',
  'an account must confirm its email before creating a salon');

set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000001"}';
select is(public.slug_status('Sarahs-Hair'), 'available', 'a free link is reported as available');
select is(public.slug_status('admin'), 'invalid', 'app paths cannot be used as a salon link');
select is(public.slug_status('-bad-'), 'invalid', 'malformed links are rejected');
select throws_ok($$ select public.create_salon('', 'fine-slug') $$, 'P0001', 'invalid_name', 'a salon needs a name');
select throws_ok($$ select public.create_salon('Fine', 'login') $$, 'P0001', 'invalid_slug', 'a reserved link is refused');

select is(public.create_salon('  Sarah''s Hair ', ' Sarahs-Hair ') ->> 'slug', 'sarahs-hair', 'a verified user can create a salon');
select is(public.slug_status('sarahs-hair'), 'taken', 'the link is now taken');
select results_eq(
  $$ select s.name, s.status::text, m.role::text from public.salons s join public.salon_members m on m.salon_id = s.id $$,
  $$ values ('Sarah''s Hair', 'onboarding', 'owner') $$,
  'the new salon is private and its creator is the owner');
select is((select count(*) from public.salon_settings) + (select count(*) from public.salon_branding), 2::bigint,
  'it has settings and branding ready to edit');
select throws_ok($$ select public.create_salon('Copycat', 'sarahs-hair') $$, 'P0001', 'slug_taken', 'a link can only be used once');

select lives_ok($$ select public.create_salon('Second', 'second-salon') $$, 'an owner can open a second salon');
select lives_ok($$ select public.create_salon('Third', 'third-salon') $$, 'and a third');
select throws_ok($$ select public.create_salon('Fourth', 'fourth-salon') $$, 'P0001', 'salon_limit', 'but not an unlimited number');

-- ---------------------------------------------------------------------------
-- Setting up and publishing (as the owner, through the normal access rules)
-- ---------------------------------------------------------------------------
reset role;
create function tests.salon() returns uuid language sql stable security definer as $$ select id from public.salons where slug = 'sarahs-hair' $$;
grant execute on all functions in schema tests to public;
set local role authenticated;
set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000001"}';

select throws_ok($$ select public.set_salon_published(tests.salon(), true) $$, 'P0001', 'needs_opening_hours',
  'a salon cannot go live without opening hours');
select lives_ok(
  $$ insert into public.salon_hours (salon_id, weekday, opens_at, closes_at)
     select tests.salon(), d, '09:00', '17:00' from generate_series(1, 5) d $$,
  'owner sets opening hours');
select throws_ok($$ select public.set_salon_published(tests.salon(), true) $$, 'P0001', 'needs_bookable_service',
  'nor without something to book');
select lives_ok(
  $$ insert into public.staff (salon_id, name, title) values (tests.salon(), 'Sarah Whitmore', 'Owner') $$,
  'owner adds a stylist');
select lives_ok(
  $$ insert into public.services (salon_id, name, duration_min, buffer_after_min, price_pence)
     values (tests.salon(), 'Cut & Blow Dry', 60, 0, 4800) $$,
  'owner adds a service');
select lives_ok(
  $$ insert into public.staff_services (salon_id, staff_id, service_id)
     select tests.salon(), f.id, v.id from public.staff f, public.services v
     where f.salon_id = tests.salon() and v.salon_id = tests.salon() $$,
  'owner links the stylist to the service');

set local role anon;
set local request.jwt.claims to '';
select is(public.get_storefront('sarahs-hair'), null, 'the salon is still hidden from the public');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', (select gen_random_uuid()), (select gen_random_uuid()), now() + interval '3 days',
                                    'Alice', 'Jones', 'alice@example.com', '+447700900123') $$,
  'P0001', 'salon_not_found', 'and cannot be booked');

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000004"}';
select throws_ok($$ select public.set_salon_published(tests.salon(), true) $$, '42501', null,
  'a stranger cannot publish someone else''s salon');
set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000001"}';
select is(public.set_salon_published(tests.salon(), true), 'active', 'the owner puts the salon live');

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.salon_members (salon_id, role, invited_email) values
       (tests.salon(), 'staff', 'amelia@example.com'),
       (tests.salon(), 'manager', 'unverified@example.com') $$,
  'owner invites two people by email');
select throws_ok(
  $$ insert into public.salon_members (salon_id, role, invited_email) values (tests.salon(), 'staff', 'AMELIA@example.com') $$,
  '23505', null, 'the same person cannot be invited twice');

set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000004"}';
select is(public.accept_invites(), 0, 'someone who was not invited joins nothing');
select is_empty('select 1 from public.salons', 'and still sees no salon');

set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000003"}';
select is(public.accept_invites(), 0, 'an unconfirmed email address cannot claim an invite');

set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000002"}';
select is(public.accept_invites(), 1, 'the invited person joins on signing in (email matched ignoring case)');
select results_eq('select name from public.salons', array['Sarah''s Hair'], 'and now sees the salon');
select results_eq(
  $$ select role::text from public.salon_members where user_id = '20000000-0000-0000-0000-000000000002' $$,
  array['staff'], 'with the role they were invited to');
select is(public.accept_invites(), 0, 'accepting again does nothing');

-- ---------------------------------------------------------------------------
-- Online booking (as a member of the public)
-- ---------------------------------------------------------------------------
reset role;
create function tests.service() returns uuid language sql stable security definer as $$ select id from public.services where salon_id = tests.salon() limit 1 $$;
create function tests.stylist() returns uuid language sql stable security definer as $$ select id from public.staff where salon_id = tests.salon() limit 1 $$;
grant execute on all functions in schema tests to public;
set local role anon;
set local request.jwt.claims to '';

insert into tests.results
select 'first', public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('10:00'),
                                        ' Alice ', 'Jones', ' Alice@Example.com ', '+447700900123', 'First visit', true);
select ok((select body ->> 'reference' from tests.results where name = 'first') ~ '^[0-9A-F]{10}$', 'a visitor can book and gets a reference');
select ok(length((select body ->> 'manage_token' from tests.results where name = 'first')) >= 40, 'and a private link to manage the booking');

select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('10:00'),
                                    'Bea', 'Smith', 'bea@example.com', '+447700900456') $$,
  'P0001', 'slot_unavailable', 'the same time cannot be booked twice');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('10:30'),
                                    'Bea', 'Smith', 'bea@example.com', '+447700900456') $$,
  'P0001', 'slot_unavailable', 'nor a time that overlaps it');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('07:00'),
                                    'Bea', 'Smith', 'bea@example.com', '+447700900456') $$,
  'P0001', 'slot_unavailable', 'a time outside opening hours is refused');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('10:07', 1),
                                    'Bea', 'Smith', 'bea@example.com', '+447700900456') $$,
  'P0001', 'slot_unavailable', 'a time that was never offered is refused');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), now() - interval '1 day',
                                    'Bea', 'Smith', 'bea@example.com', '+447700900456') $$,
  'P0001', 'slot_unavailable', 'a time in the past is refused');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('11:00'),
                                    'Bea', 'Smith', 'not-an-email', '+447700900456') $$,
  'P0001', 'invalid_email', 'a real email address is required');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('11:00'),
                                    'Bea', 'Smith', 'bea@example.com', null) $$,
  'P0001', 'phone_required', 'a mobile number is required when the salon asks for one');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('11:00'),
                                    'Bea', 'Smith', 'bea@example.com', '07700900456') $$,
  'P0001', 'invalid_phone', 'the mobile number must be in international format');
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', (select gen_random_uuid()), tests.stylist(), tests.at('11:00'),
                                    'Bea', 'Smith', 'bea@example.com', '+447700900456') $$,
  'P0001', 'service_unavailable', 'an unknown service is refused');
select throws_ok(
  $$ select public.book_appointment('second-salon', tests.service(), tests.stylist(), tests.at('11:00'),
                                    'Bea', 'Smith', 'bea@example.com', '+447700900456') $$,
  'P0001', 'salon_not_found', 'a salon that is not live cannot be booked');

-- A returning client (same mobile) is recognised, and her record is not overwritten
insert into tests.results
select 'second', public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('11:00', 1),
                                         'Mallory', 'Imposter', 'mallory@example.com', '+447700900123');

reset role;
select results_eq(
  $$ select first_name, last_name, email, phone, marketing_opt_in, source::text from public.clients where salon_id = tests.salon() $$,
  $$ values ('Alice', 'Jones', 'alice@example.com', '+447700900123', true, 'online') $$,
  'one client record, cleaned up, and unchanged by the second booking');
select results_eq(
  $$ select b.status::text, b.source::text, b.total_pence, b.deposit_pence, b.client_note,
            to_char(b.ends_at at time zone 'Europe/London', 'HH24:MI')
     from public.bookings b where b.reference = (select body ->> 'reference' from tests.results where name = 'first') $$,
  $$ values ('confirmed', 'online', 4800, 0, 'First visit', '11:00') $$,
  'the booking is confirmed with the right price, note and end time');
select is((select count(*) from public.booking_items), 2::bigint, 'each booking records the service booked');
select results_eq(
  $$ select n.channel::text, n.template, n.recipient
     from public.notifications n join public.bookings b on b.id = n.booking_id
     where b.reference = (select body ->> 'reference' from tests.results where name = 'first')
     order by n.scheduled_for $$,
  $$ values ('email', 'booking_confirmed', 'alice@example.com'),
            ('sms', 'booking_reminder', '+447700900123'),
            ('sms', 'booking_reminder', '+447700900123') $$,
  'a confirmation email and two text reminders are queued');
select is(
  (select a.manage_token from public.booking_access a join public.bookings b on b.id = a.booking_id
    where b.reference = (select body ->> 'reference' from tests.results where name = 'first')),
  (select body ->> 'manage_token' from tests.results where name = 'first'),
  'the manage link returned matches the one stored');
select results_eq(
  $$ select n.recipient from public.notifications n join public.bookings b on b.id = n.booking_id
     where b.reference = (select body ->> 'reference' from tests.results where name = 'second') and n.template = 'booking_confirmed' $$,
  array['mallory@example.com'],
  'messages for a booking go to the contact details given for that booking');

-- The team sees online bookings in the diary
set local role authenticated;
set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000002"}';
select is((select count(*) from public.bookings where source = 'online'), 2::bigint, 'staff see online bookings in their diary');

-- An expired payment hold no longer blocks the slot (and is cleared when someone books it)
reset role;
insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, hold_expires_at)
values (tests.salon(), tests.stylist(), tests.at('14:00'), tests.at('15:00'), 'pending_payment', now() - interval '1 minute');
set local role anon;
set local request.jwt.claims to '';
select lives_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('14:00'),
                                    'Cara', 'Lee', 'cara@example.com', '+447700900789') $$,
  'a slot whose payment hold has expired can be booked');
reset role;
select results_eq(
  $$ select status::text, cancelled_by::text from public.bookings where hold_expires_at is not null $$,
  $$ values ('cancelled', 'system') $$, 'and the expired hold is released');

-- Limits
set local role anon;
set local request.jwt.claims to '';
select lives_ok(format(
  $f$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('09:00', %s),
                                     'Alice', 'Jones', 'alice@example.com', '+447700900123') $f$, d),
  'client books appointment ' || (d + 2) || ' of 5')
from generate_series(2, 4) d;
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('15:00', 2),
                                    'Alice', 'Jones', 'alice@example.com', '+447700900123') $$,
  'P0001', 'too_many_bookings', 'one client cannot hold more than five upcoming bookings');

-- Deposits are never skipped
reset role;
update public.salons set stripe_charges_enabled = true where id = tests.salon();
update public.salon_settings set deposit_type = 'fixed', deposit_value = 1500 where salon_id = tests.salon();
set local role anon;
set local request.jwt.claims to '';
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('16:00', 3),
                                    'Dana', 'Roe', 'dana@example.com', '+447700900321') $$,
  'P0001', 'deposit_required', 'when a deposit is due, booking without paying is refused');

-- Flood fuse
reset role;
update public.salons set stripe_charges_enabled = false where id = tests.salon();
insert into public.bookings (salon_id, staff_id, starts_at, ends_at, status, source)
select tests.salon(), tests.stylist(), now() + make_interval(days => 40 + g), now() + make_interval(days => 40 + g, hours => 1), 'confirmed', 'online'
from generate_series(1, 40) g;
set local role anon;
set local request.jwt.claims to '';
select throws_ok(
  $$ select public.book_appointment('sarahs-hair', tests.service(), tests.stylist(), tests.at('16:00', 3),
                                    'Dana', 'Roe', 'dana@example.com', '+447700900321') $$,
  'P0001', 'try_later', 'a burst of online bookings trips the fuse');

-- Taking the salon offline
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000002"}';
select throws_ok($$ select public.set_salon_published(tests.salon(), false) $$, '42501', null, 'staff cannot take the salon offline');
set local request.jwt.claims to '{"sub": "20000000-0000-0000-0000-000000000001"}';
select is(public.set_salon_published(tests.salon(), false), 'onboarding', 'the owner can take the salon offline');
set local role anon;
set local request.jwt.claims to '';
select is(public.get_storefront('sarahs-hair'), null, 'and it disappears from public view');

reset role;
select * from finish();
rollback;

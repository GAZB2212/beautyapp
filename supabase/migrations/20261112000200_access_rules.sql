-- 0002 access rules (Row Level Security).
--
-- Who can do what:
--   Public visitor  : no table access at all. Reads one salon's public page and free time
--                     slots through two functions. Bookings are created by server functions.
--   Staff           : their own salon's diary, clients, services (read). Create/edit bookings,
--                     blocked time and clients.
--   Manager         : staff + edit services, team, hours, branding.
--   Owner           : manager + booking rules, salon details, team membership, and is the
--                     only role that can read payment records and the subscription.
--   Nobody          : another salon's data. Stripe identifiers are never writable from the API.
--
-- Three layers enforce this: explicit grants (column-level for writes), RLS policies, and
-- composite foreign keys / triggers that stop rows crossing between salons.

-- ---------------------------------------------------------------------------
-- 1. Start from zero. Nothing is reachable unless granted below.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- Server-side code (Edge Functions) uses the service role, which bypasses RLS.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 2. Membership helper used by every policy
-- ---------------------------------------------------------------------------
-- Salons the current user belongs to with at least the given role.
create or replace function app.salon_ids(min_role public.member_role default 'staff')
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.salon_id
  from public.salon_members m
  where m.user_id = (select auth.uid())
    and app.role_rank(m.role) >= app.role_rank(min_role)
$$;
revoke all on function app.salon_ids(public.member_role) from public;
grant execute on function app.salon_ids(public.member_role) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Guards that hold even if a policy is ever written wrongly
-- ---------------------------------------------------------------------------
-- A row can never be moved to another salon.
create or replace function app.forbid_salon_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.salon_id is distinct from old.salon_id then
    raise exception 'salon_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;

do $$
declare t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'salon_id' and tb.table_type = 'BASE TABLE'
  loop
    execute format(
      'create trigger forbid_salon_change before update on public.%I for each row execute function app.forbid_salon_change()',
      t.table_name);
  end loop;
end $$;

-- A salon always keeps at least one owner.
create or replace function app.protect_last_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.user_id is distinct from old.user_id)
     and exists (select 1 from public.salons s where s.id = old.salon_id)   -- not a salon being deleted
     and not exists (
       select 1 from public.salon_members m
       where m.salon_id = old.salon_id and m.role = 'owner' and m.user_id is not null and m.id <> old.id
     )
  then
    raise exception 'a salon must keep at least one owner' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;
create trigger protect_last_owner before update or delete on public.salon_members
  for each row execute function app.protect_last_owner();

-- ---------------------------------------------------------------------------
-- 4. Grants and policies, table by table
--    select = any member of the salon unless stated otherwise
-- ---------------------------------------------------------------------------

-- salons ---------------------------------------------------------------------
-- Created through a server-side signup function (step 2), never directly.
grant select on public.salons to authenticated;
grant update (name, timezone, address_line1, address_line2, city, postcode, country, phone, email)
  on public.salons to authenticated;                       -- not slug, status or any Stripe field
create policy "members read their salon" on public.salons
  for select to authenticated using (id in (select app.salon_ids('staff')));
create policy "owners edit salon details" on public.salons
  for update to authenticated
  using (id in (select app.salon_ids('owner')))
  with check (id in (select app.salon_ids('owner')));

-- salon_settings (deposit, cancellation and booking rules) --------------------
grant select on public.salon_settings to authenticated;
grant update (deposit_type, deposit_value, cancellation_window_hours, no_show_fee_type, no_show_fee_value,
              slot_interval_min, min_notice_hours, max_advance_days, reminder_hours, allow_staff_choice, require_phone)
  on public.salon_settings to authenticated;
create policy "members read settings" on public.salon_settings
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));
create policy "owners edit settings" on public.salon_settings
  for update to authenticated
  using (salon_id in (select app.salon_ids('owner')))
  with check (salon_id in (select app.salon_ids('owner')));

-- salon_members (the team's logins) ------------------------------------------
grant select on public.salon_members to authenticated;
grant insert (salon_id, role, invited_email) on public.salon_members to authenticated;   -- invites only; user_id is set on acceptance (step 2)
grant update (role) on public.salon_members to authenticated;
grant delete on public.salon_members to authenticated;
create policy "see own membership, managers see the team" on public.salon_members
  for select to authenticated
  using (user_id = (select auth.uid()) or salon_id in (select app.salon_ids('manager')));
create policy "owners invite" on public.salon_members
  for insert to authenticated with check (salon_id in (select app.salon_ids('owner')));
create policy "owners change roles" on public.salon_members
  for update to authenticated
  using (salon_id in (select app.salon_ids('owner')))
  with check (salon_id in (select app.salon_ids('owner')));
create policy "owners remove members" on public.salon_members
  for delete to authenticated using (salon_id in (select app.salon_ids('owner')));

-- salon_branding --------------------------------------------------------------
grant select on public.salon_branding to authenticated;
grant update (logo_path, cover_path, palette, primary_color, accent_color, font_style, layout, tagline, about,
              booking_message, instagram, facebook, tiktok, website, whatsapp)
  on public.salon_branding to authenticated;
create policy "members read branding" on public.salon_branding
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));
create policy "managers edit branding" on public.salon_branding
  for update to authenticated
  using (salon_id in (select app.salon_ids('manager')))
  with check (salon_id in (select app.salon_ids('manager')));

-- Tables managers maintain: hours, gallery, staff, staff hours, services ------
grant select, insert, update, delete on
  public.salon_hours, public.salon_gallery_images, public.staff_hours,
  public.service_categories, public.services, public.staff_services
  to authenticated;
grant select, delete on public.staff to authenticated;
grant insert (salon_id, name, bio, avatar_path, colour, is_bookable, active, sort_order) on public.staff to authenticated;
grant update (name, bio, avatar_path, colour, is_bookable, active, sort_order) on public.staff to authenticated;   -- not user_id

do $$
declare t text;
begin
  foreach t in array array['salon_hours', 'salon_gallery_images', 'staff', 'staff_hours',
                           'service_categories', 'services', 'staff_services']
  loop
    execute format($f$create policy "members read" on public.%I
      for select to authenticated using (salon_id in (select app.salon_ids('staff')))$f$, t);
    execute format($f$create policy "managers add" on public.%I
      for insert to authenticated with check (salon_id in (select app.salon_ids('manager')))$f$, t);
    execute format($f$create policy "managers edit" on public.%I
      for update to authenticated
      using (salon_id in (select app.salon_ids('manager')))
      with check (salon_id in (select app.salon_ids('manager')))$f$, t);
    execute format($f$create policy "managers remove" on public.%I
      for delete to authenticated using (salon_id in (select app.salon_ids('manager')))$f$, t);
  end loop;
end $$;

-- salon_domains (phase 2): read only -----------------------------------------
grant select on public.salon_domains to authenticated;
create policy "members read" on public.salon_domains
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));

-- blocks (blocked-out time): any member --------------------------------------
grant select, delete on public.blocks to authenticated;
grant insert (salon_id, staff_id, starts_at, ends_at, kind, reason) on public.blocks to authenticated;
grant update (staff_id, starts_at, ends_at, kind, reason) on public.blocks to authenticated;
create policy "members read" on public.blocks
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));
create policy "members add" on public.blocks
  for insert to authenticated with check (salon_id in (select app.salon_ids('staff')));
create policy "members edit" on public.blocks
  for update to authenticated
  using (salon_id in (select app.salon_ids('staff')))
  with check (salon_id in (select app.salon_ids('staff')));
create policy "members remove" on public.blocks
  for delete to authenticated using (salon_id in (select app.salon_ids('staff')));

-- clients: any member reads/creates/edits; managers delete --------------------
grant select, delete on public.clients to authenticated;
grant insert (salon_id, first_name, last_name, email, phone, notes, marketing_opt_in, source) on public.clients to authenticated;
grant update (first_name, last_name, email, phone, notes, marketing_opt_in) on public.clients to authenticated;
create policy "members read" on public.clients
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));
create policy "members add" on public.clients
  for insert to authenticated with check (salon_id in (select app.salon_ids('staff')));
create policy "members edit" on public.clients
  for update to authenticated
  using (salon_id in (select app.salon_ids('staff')))
  with check (salon_id in (select app.salon_ids('staff')));
create policy "managers remove" on public.clients
  for delete to authenticated using (salon_id in (select app.salon_ids('manager')));

-- bookings: any member reads, creates dashboard/walk-in bookings, moves, cancels.
-- Never deleted (cancel instead). Deposit, token and hold fields are server-only.
grant select on public.bookings to authenticated;
grant insert (salon_id, client_id, staff_id, starts_at, ends_at, buffer_after_min, status, source,
              total_pence, client_note, internal_note)
  on public.bookings to authenticated;
grant update (client_id, staff_id, starts_at, ends_at, buffer_after_min, status, total_pence,
              client_note, internal_note, cancelled_at, cancelled_by, cancellation_reason)
  on public.bookings to authenticated;
create policy "members read" on public.bookings
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));
create policy "members add dashboard bookings" on public.bookings
  for insert to authenticated
  with check (
    salon_id in (select app.salon_ids('staff'))
    and source in ('dashboard', 'walk_in')
    and status = 'confirmed'
  );
create policy "members edit" on public.bookings
  for update to authenticated
  using (salon_id in (select app.salon_ids('staff')))
  with check (salon_id in (select app.salon_ids('staff')) and status <> 'pending_payment');

-- booking_items ---------------------------------------------------------------
grant select, insert, update, delete on public.booking_items to authenticated;
create policy "members read" on public.booking_items
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));
create policy "members add" on public.booking_items
  for insert to authenticated with check (salon_id in (select app.salon_ids('staff')));
create policy "members edit" on public.booking_items
  for update to authenticated
  using (salon_id in (select app.salon_ids('staff')))
  with check (salon_id in (select app.salon_ids('staff')));
create policy "members remove" on public.booking_items
  for delete to authenticated using (salon_id in (select app.salon_ids('staff')));

-- Read-only history and message log for members --------------------------------
grant select on public.booking_events, public.notifications to authenticated;
create policy "members read" on public.booking_events
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));
create policy "members read" on public.notifications
  for select to authenticated using (salon_id in (select app.salon_ids('staff')));

-- Money: owners only, read only. Written by the Stripe webhook (service role). --
grant select on public.payments, public.client_payment_methods, public.subscriptions to authenticated;
create policy "owners read payments" on public.payments
  for select to authenticated using (salon_id in (select app.salon_ids('owner')));
create policy "owners read saved cards" on public.client_payment_methods
  for select to authenticated using (salon_id in (select app.salon_ids('owner')));
create policy "owners read subscription" on public.subscriptions
  for select to authenticated using (salon_id in (select app.salon_ids('owner')));

-- push_tokens: each user manages their own devices ----------------------------
grant select, delete on public.push_tokens to authenticated;
grant insert (user_id, expo_token, platform) on public.push_tokens to authenticated;
grant update (platform, last_seen_at) on public.push_tokens to authenticated;
create policy "own devices" on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- stripe_events, client_salons: no API access (server only / phase 2).

-- ---------------------------------------------------------------------------
-- 5. What the public booking page can read
-- ---------------------------------------------------------------------------
-- One salon's public page as a single JSON document. Returns null for unknown slugs and
-- for salons that are not live (members can preview their own salon before launch).
create or replace function public.get_storefront(p_slug text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'salon', jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'name', s.name, 'timezone', s.timezone, 'currency', s.currency,
      'address_line1', s.address_line1, 'address_line2', s.address_line2, 'city', s.city,
      'postcode', s.postcode, 'country', s.country, 'phone', s.phone, 'email', s.email,
      'online_payments', s.stripe_charges_enabled),
    'branding', (
      select jsonb_build_object(
        'logo_path', b.logo_path, 'cover_path', b.cover_path, 'palette', b.palette,
        'primary_color', b.primary_color, 'accent_color', b.accent_color,
        'font_style', b.font_style, 'layout', b.layout, 'tagline', b.tagline, 'about', b.about,
        'booking_message', b.booking_message, 'instagram', b.instagram, 'facebook', b.facebook,
        'tiktok', b.tiktok, 'website', b.website, 'whatsapp', b.whatsapp)
      from public.salon_branding b where b.salon_id = s.id),
    'booking_rules', (
      select jsonb_build_object(
        'deposit_type', st.deposit_type, 'deposit_value', st.deposit_value,
        'cancellation_window_hours', st.cancellation_window_hours,
        'no_show_fee_type', st.no_show_fee_type, 'no_show_fee_value', st.no_show_fee_value,
        'min_notice_hours', st.min_notice_hours, 'max_advance_days', st.max_advance_days,
        'allow_staff_choice', st.allow_staff_choice, 'require_phone', st.require_phone)
      from public.salon_settings st where st.salon_id = s.id),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object(
        'weekday', h.weekday, 'opens_at', to_char(h.opens_at, 'HH24:MI'), 'closes_at', to_char(h.closes_at, 'HH24:MI'))
        order by h.weekday, h.opens_at)
      from public.salon_hours h where h.salon_id = s.id), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.sort_order, c.name)
      from public.service_categories c where c.salon_id = s.id), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'category_id', v.category_id, 'name', v.name, 'description', v.description,
        'duration_min', v.duration_min, 'price_pence', v.price_pence, 'price_is_from', v.price_is_from,
        'image_path', v.image_path, 'deposit_override_pence', v.deposit_override_pence,
        'staff_ids', coalesce((
          select jsonb_agg(ss.staff_id)
          from public.staff_services ss
          join public.staff f on f.id = ss.staff_id and f.active and f.is_bookable
          where ss.service_id = v.id), '[]'::jsonb))
        order by v.sort_order, v.name)
      from public.services v where v.salon_id = s.id and v.active and v.online_bookable), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'bio', f.bio, 'avatar_path', f.avatar_path)
        order by f.sort_order, f.name)
      from public.staff f where f.salon_id = s.id and f.active and f.is_bookable), '[]'::jsonb),
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object('path', g.storage_path, 'caption', g.caption) order by g.sort_order)
      from public.salon_gallery_images g where g.salon_id = s.id), '[]'::jsonb)
  )
  from public.salons s
  where s.slug = lower(p_slug)
    and (s.status = 'active' or s.id in (select app.salon_ids('staff')))
$$;
revoke all on function public.get_storefront(text) from public, anon, authenticated;
grant execute on function public.get_storefront(text) to anon, authenticated, service_role;

-- Free appointment start times for a service. Returns times only: never who has booked,
-- or why a time is unavailable.
create or replace function public.get_availability(
  p_slug text,
  p_service_id uuid,
  p_from date,
  p_days integer default 14,
  p_staff_id uuid default null
)
returns table (staff_id uuid, starts_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with salon as (
    select s.id, s.timezone, st.slot_interval_min, st.min_notice_hours, st.max_advance_days,
           (now() at time zone s.timezone)::date as today
    from public.salons s
    join public.salon_settings st on st.salon_id = s.id
    where s.slug = lower(p_slug)
      and (s.status = 'active' or s.id in (select app.salon_ids('staff')))
  ),
  eligible as (   -- bookable stylists who offer this service
    select f.id as staff_id,
           coalesce(ss.duration_override_min, v.duration_min) as duration_min,
           v.buffer_after_min
    from salon
    join public.services v on v.salon_id = salon.id and v.id = p_service_id and v.active and v.online_bookable
    join public.staff_services ss on ss.service_id = v.id
    join public.staff f on f.id = ss.staff_id and f.active and f.is_bookable
    where p_staff_id is null or f.id = p_staff_id
  ),
  days as (
    select d::date as day
    from salon,
         generate_series(
           greatest(p_from, salon.today)::timestamp,
           least(p_from + least(greatest(p_days, 1), 31) - 1, salon.today + salon.max_advance_days)::timestamp,
           interval '1 day') d
  ),
  windows as (   -- the stylist's own hours if set, otherwise the salon's opening hours
    select e.staff_id, e.duration_min, e.buffer_after_min, d.day, w.open_t, w.close_t
    from eligible e
    cross join days d
    cross join salon
    cross join lateral (
      select sh.starts_at as open_t, sh.ends_at as close_t
      from public.staff_hours sh
      where sh.staff_id = e.staff_id and sh.weekday = extract(dow from d.day)
      union all
      select h.opens_at, h.closes_at
      from public.salon_hours h
      where h.salon_id = salon.id and h.weekday = extract(dow from d.day)
        and not exists (select 1 from public.staff_hours x where x.staff_id = e.staff_id)
    ) w
  ),
  slots as (
    select w.staff_id, w.duration_min, w.buffer_after_min,
           ((w.day + w.open_t + make_interval(mins => m)) at time zone salon.timezone) as starts_at
    from windows w
    cross join salon
    cross join lateral generate_series(
      0,
      (extract(epoch from (w.close_t - w.open_t)) / 60)::integer - w.duration_min,
      salon.slot_interval_min) m
  )
  select sl.staff_id, sl.starts_at
  from slots sl
  cross join salon
  where sl.starts_at >= now() + make_interval(hours => salon.min_notice_hours)
    and not exists (   -- clashes with a live booking (including its clean-down time)
      select 1 from public.bookings b
      where b.staff_id = sl.staff_id
        and (b.status = 'confirmed' or (b.status = 'pending_payment' and b.hold_expires_at > now()))
        and b.starts_at < sl.starts_at + make_interval(mins => sl.duration_min + sl.buffer_after_min)
        and b.ends_at + make_interval(mins => b.buffer_after_min) > sl.starts_at)
    and not exists (   -- clashes with blocked time (stylist's own, or salon-wide)
      select 1 from public.blocks k
      where k.salon_id = salon.id
        and (k.staff_id is null or k.staff_id = sl.staff_id)
        and k.starts_at < sl.starts_at + make_interval(mins => sl.duration_min)
        and k.ends_at > sl.starts_at)
  order by sl.starts_at, sl.staff_id
$$;
revoke all on function public.get_availability(text, uuid, date, integer, uuid) from public, anon, authenticated;
grant execute on function public.get_availability(text, uuid, date, integer, uuid) to anon, authenticated, service_role;

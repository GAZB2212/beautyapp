-- 0003 salon sign-up, team invites, publishing, and online booking.
--
-- These are the only ways to do things the access rules deliberately keep out of direct
-- table access: creating a salon, joining one, putting it live, and booking as a member of
-- the public. Each function validates its input and runs with the owner's rights, so its
-- checks are the security boundary. Errors are raised as short codes (e.g. 'slug_taken')
-- that the apps translate into friendly messages.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Paths the apps use themselves, which can never be a salon link.
-- Keep in step with RESERVED_SLUGS in packages/core/src/slug.ts.
create or replace function app.is_reserved_slug(p_slug text)
returns boolean language sql immutable as $$
  select p_slug = any (array[
    'admin', 'api', 'app', 'b', 'book', 'dashboard', 'login', 'signup', 'privacy', 'terms',
    'manage', 'salon', 'salons', 'settings', 'support', 'www'])
$$;

-- The signed-in user's email, only if they have confirmed it.
create or replace function app.verified_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
$$;
revoke all on function app.verified_email() from public;

-- ---------------------------------------------------------------------------
-- Salon sign-up
-- ---------------------------------------------------------------------------
-- 'available' | 'taken' | 'invalid'
create or replace function public.slug_status(p_slug text)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when p_slug is null or lower(trim(p_slug)) !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
         or app.is_reserved_slug(lower(trim(p_slug))) then 'invalid'
    when exists (select 1 from public.salons s where s.slug = lower(trim(p_slug))) then 'taken'
    else 'available'
  end
$$;
revoke all on function public.slug_status(text) from public, anon, authenticated;
grant execute on function public.slug_status(text) to authenticated, service_role;

-- Creates a salon and makes the caller its owner. The salon starts private ("onboarding").
create or replace function public.create_salon(p_name text, p_slug text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if app.verified_email() is null then
    raise exception 'email_not_verified';
  end if;
  if length(v_name) not between 1 and 80 then
    raise exception 'invalid_name';
  end if;
  if public.slug_status(v_slug) = 'invalid' then
    raise exception 'invalid_slug';
  end if;
  if (select count(*) from public.salon_members m where m.user_id = v_uid and m.role = 'owner') >= 3 then
    raise exception 'salon_limit';
  end if;

  begin
    insert into public.salons (slug, name) values (v_slug, v_name) returning id into v_id;
  exception when unique_violation then
    raise exception 'slug_taken';
  end;
  insert into public.salon_members (salon_id, user_id, role, accepted_at) values (v_id, v_uid, 'owner', now());

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end $$;
revoke all on function public.create_salon(text, text) from public, anon, authenticated;
grant execute on function public.create_salon(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Team invites
-- ---------------------------------------------------------------------------
-- Joins the caller to every salon that invited their confirmed email address.
-- Returns how many salons they joined.
create or replace function public.accept_invites()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text := app.verified_email();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if v_email is null then
    return 0;
  end if;

  update public.salon_members m
     set user_id = v_uid, accepted_at = now()
   where m.user_id is null
     and lower(m.invited_email) = v_email
     and not exists (select 1 from public.salon_members x where x.salon_id = m.salon_id and x.user_id = v_uid);
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.accept_invites() from public, anon, authenticated;
grant execute on function public.accept_invites() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Publishing
-- ---------------------------------------------------------------------------
-- Owners put their salon live, or take it offline again. A salon needs opening hours and
-- at least one bookable service with a bookable stylist before it can go live.
create or replace function public.set_salon_published(p_salon_id uuid, p_published boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_status public.salon_status;
begin
  if p_salon_id is null or p_salon_id not in (select app.salon_ids('owner')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select s.status into v_status from public.salons s where s.id = p_salon_id for update;
  if v_status = 'suspended' then
    raise exception 'salon_suspended';
  end if;

  if p_published then
    if not exists (select 1 from public.salon_hours h where h.salon_id = p_salon_id)
       and not exists (select 1 from public.staff_hours h where h.salon_id = p_salon_id) then
      raise exception 'needs_opening_hours';
    end if;
    if not exists (
      select 1
      from public.services v
      join public.staff_services ss on ss.service_id = v.id
      join public.staff f on f.id = ss.staff_id and f.active and f.is_bookable
      where v.salon_id = p_salon_id and v.active and v.online_bookable
    ) then
      raise exception 'needs_bookable_service';
    end if;
    update public.salons set status = 'active' where id = p_salon_id;
    return 'active';
  end if;

  update public.salons set status = 'onboarding' where id = p_salon_id;
  return 'onboarding';
end $$;
revoke all on function public.set_salon_published(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_salon_published(uuid, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Online booking (no payment). Bookings that need a deposit go through the payment flow.
-- ---------------------------------------------------------------------------
create or replace function public.book_appointment(
  p_slug text,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text default null,
  p_note text default null,
  p_marketing_opt_in boolean default false
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_first   text := trim(coalesce(p_first_name, ''));
  v_last    text := nullif(trim(coalesce(p_last_name, '')), '');
  v_email   text := lower(trim(coalesce(p_email, '')));
  v_phone   text := nullif(regexp_replace(coalesce(p_phone, ''), '[[:space:]]', '', 'g'), '');
  v_note    text := nullif(trim(coalesce(p_note, '')), '');
  v_salon   record;
  v_svc     record;
  v_deposit integer := 0;
  v_client  uuid;
  v_booking record;
  v_ends    timestamptz;
  v_token   text;
  v_hours   integer;
begin
  -- 1. What the client typed
  if length(v_first) not between 1 and 60 or length(coalesce(v_last, '')) > 60 then
    raise exception 'invalid_name';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'invalid_email';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'invalid_phone';
  end if;
  if length(coalesce(v_note, '')) > 500 then
    raise exception 'invalid_note';
  end if;
  if p_starts_at is null or p_service_id is null or p_staff_id is null then
    raise exception 'slot_unavailable';
  end if;

  -- 2. The salon must be live
  select s.id, s.timezone, s.stripe_charges_enabled,
         st.require_phone, st.deposit_type, st.deposit_value, st.reminder_hours
    into v_salon
    from public.salons s
    join public.salon_settings st on st.salon_id = s.id
   where s.slug = lower(trim(coalesce(p_slug, ''))) and s.status = 'active';
  if not found then
    raise exception 'salon_not_found';
  end if;
  if v_salon.require_phone and v_phone is null then
    raise exception 'phone_required';
  end if;

  -- 3. The service, as offered by this stylist
  select v.name,
         coalesce(ss.duration_override_min, v.duration_min) as duration_min,
         v.buffer_after_min,
         coalesce(ss.price_override_pence, v.price_pence) as price_pence,
         v.deposit_override_pence
    into v_svc
    from public.services v
    join public.staff_services ss on ss.service_id = v.id and ss.staff_id = p_staff_id
    join public.staff f on f.id = ss.staff_id and f.active and f.is_bookable
   where v.id = p_service_id and v.salon_id = v_salon.id and v.active and v.online_bookable;
  if not found then
    raise exception 'service_unavailable';
  end if;

  -- 4. Deposits are taken by the payment flow, never skipped here
  if v_salon.stripe_charges_enabled then
    v_deposit := case
      when v_svc.deposit_override_pence is not null then least(v_svc.deposit_override_pence, v_svc.price_pence)
      when v_salon.deposit_type = 'fixed' then least(v_salon.deposit_value, v_svc.price_pence)
      when v_salon.deposit_type = 'percent' then round(v_svc.price_pence * least(v_salon.deposit_value, 100) / 100.0)::integer
      else 0 end;
  end if;
  if v_deposit > 0 then
    raise exception 'deposit_required';
  end if;

  -- 5. A fuse against someone flooding a salon's diary
  if (select count(*) from public.bookings b
       where b.salon_id = v_salon.id and b.source = 'online' and b.created_at > now() - interval '1 hour') >= 40 then
    raise exception 'try_later';
  end if;

  -- 6. One booking at a time per stylist, so "is it free?" and "book it" cannot interleave
  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text, 0));

  -- Unpaid holds that have run out no longer block the diary
  update public.bookings b
     set status = 'cancelled', cancelled_by = 'system', cancelled_at = now(),
         cancellation_reason = 'payment_not_completed'
   where b.salon_id = v_salon.id and b.staff_id = p_staff_id
     and b.status = 'pending_payment' and b.hold_expires_at <= now();

  -- Exactly the same rules as the times the page offered
  if not exists (
    select 1
    from public.get_availability(p_slug, p_service_id, (p_starts_at at time zone v_salon.timezone)::date, 1, p_staff_id) a
    where a.starts_at = p_starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  -- 7. Find the client by mobile, then email; otherwise create them.
  --    An existing client's details are never changed by an online booking.
  if v_phone is not null then
    select c.id into v_client from public.clients c where c.salon_id = v_salon.id and c.phone = v_phone;
  end if;
  if v_client is null then
    select c.id into v_client from public.clients c where c.salon_id = v_salon.id and lower(c.email) = v_email;
  end if;
  if v_client is null then
    begin
      insert into public.clients (salon_id, first_name, last_name, email, phone, marketing_opt_in, source)
      values (v_salon.id, v_first, v_last, v_email, v_phone, coalesce(p_marketing_opt_in, false), 'online')
      returning id into v_client;
    exception when unique_violation then   -- created a moment ago by a parallel request
      select c.id into v_client from public.clients c
       where c.salon_id = v_salon.id and (c.phone = v_phone or lower(c.email) = v_email)
       limit 1;
    end;
  elsif coalesce(p_marketing_opt_in, false) then
    update public.clients set marketing_opt_in = true where id = v_client and not marketing_opt_in;
  end if;

  if (select count(*) from public.bookings b
       where b.client_id = v_client and b.status = 'confirmed' and b.starts_at > now()) >= 5 then
    raise exception 'too_many_bookings';
  end if;

  -- 8. Book it. The exclusion constraint is the final word on double-booking.
  v_ends := p_starts_at + make_interval(mins => v_svc.duration_min);
  begin
    insert into public.bookings (salon_id, client_id, staff_id, starts_at, ends_at, buffer_after_min,
                                 status, source, total_pence, deposit_pence, client_note)
    values (v_salon.id, v_client, p_staff_id, p_starts_at, v_ends, v_svc.buffer_after_min,
            'confirmed', 'online', v_svc.price_pence, 0, v_note)
    returning id, reference into v_booking;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;

  insert into public.booking_items (salon_id, booking_id, service_id, service_name, duration_min, price_pence, starts_at, ends_at)
  values (v_salon.id, v_booking.id, p_service_id, v_svc.name, v_svc.duration_min, v_svc.price_pence, p_starts_at, v_ends);

  insert into public.booking_events (salon_id, booking_id, type, actor)
  values (v_salon.id, v_booking.id, 'created', 'client');

  -- 9. Queue the messages: confirmation by email now; reminders by text when we have a
  --    mobile number, otherwise by email. Sent using the contact details given for this booking.
  insert into public.notifications (salon_id, booking_id, client_id, channel, template, recipient)
  values (v_salon.id, v_booking.id, v_client, 'email', 'booking_confirmed', v_email);

  foreach v_hours in array v_salon.reminder_hours loop
    if p_starts_at - make_interval(hours => v_hours) > now() then
      insert into public.notifications (salon_id, booking_id, client_id, channel, template, recipient, scheduled_for)
      values (v_salon.id, v_booking.id, v_client,
              case when v_phone is not null then 'sms' else 'email' end::public.notification_channel,
              'booking_reminder',
              coalesce(v_phone, v_email),
              p_starts_at - make_interval(hours => v_hours));
    end if;
  end loop;

  select a.manage_token into v_token from public.booking_access a where a.booking_id = v_booking.id;

  return jsonb_build_object(
    'reference', v_booking.reference,
    'starts_at', p_starts_at,
    'ends_at', v_ends,
    'manage_token', v_token);
end $$;
revoke all on function public.book_appointment(text, uuid, uuid, timestamptz, text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.book_appointment(text, uuid, uuid, timestamptz, text, text, text, text, text, boolean)
  to anon, authenticated, service_role;

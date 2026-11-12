-- 0001 core schema: tenancy, catalogue, clients, bookings, money, messaging.
-- Every tenant-owned table carries salon_id, and child rows reference their parents with
-- composite (salon_id, id) foreign keys, so a row can never point at another salon's data.
-- RLS is enabled on every table here; the access rules live in the next migration.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;   -- uuid = in exclusion constraints

-- Private helper schema. Not exposed through the API (see supabase/config.toml [api] schemas).
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.salon_status as enum ('onboarding', 'active', 'suspended');
create type public.member_role as enum ('staff', 'manager', 'owner');
create type public.deposit_type as enum ('none', 'fixed', 'percent');
create type public.font_style as enum ('modern', 'classic', 'editorial');
create type public.layout_style as enum ('classic', 'editorial', 'minimal');
create type public.block_kind as enum ('block', 'holiday', 'break');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'no_show', 'completed');
create type public.booking_source as enum ('online', 'dashboard', 'walk_in', 'app');
create type public.cancelled_by as enum ('client', 'salon', 'system');
create type public.payment_kind as enum ('deposit', 'no_show_fee', 'balance', 'refund');
create type public.payment_status as enum ('requires_payment', 'processing', 'succeeded', 'failed', 'refunded');
create type public.notification_channel as enum ('email', 'sms', 'push');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'cancelled');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function app.role_rank(r public.member_role)
returns int language sql immutable as $$
  select case r when 'owner' then 3 when 'manager' then 2 else 1 end
$$;

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
create table public.salons (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name             text not null check (length(name) between 1 and 80),
  status           public.salon_status not null default 'onboarding',
  timezone         text not null default 'Europe/London',
  currency         char(3) not null default 'GBP',
  address_line1    text,
  address_line2    text,
  city             text,
  postcode         text,
  country          char(2) not null default 'GB',
  phone            text,
  email            text,
  -- Stripe Connect (direct charges land in this account)
  stripe_account_id        text unique,
  stripe_charges_enabled   boolean not null default false,
  stripe_details_submitted boolean not null default false,
  -- Stripe Billing (our subscription)
  stripe_customer_id       text unique,
  trial_ends_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger salons_updated_at before update on public.salons for each row execute function app.set_updated_at();

create table public.salon_settings (
  salon_id                  uuid primary key references public.salons(id) on delete cascade,
  deposit_type              public.deposit_type not null default 'none',
  deposit_value             integer not null default 0 check (deposit_value >= 0),   -- pence or percent
  cancellation_window_hours integer not null default 24 check (cancellation_window_hours >= 0),
  no_show_fee_type          public.deposit_type not null default 'none',
  no_show_fee_value         integer not null default 0 check (no_show_fee_value >= 0),
  slot_interval_min         integer not null default 15 check (slot_interval_min in (5, 10, 15, 20, 30, 60)),
  min_notice_hours          integer not null default 2 check (min_notice_hours >= 0),
  max_advance_days          integer not null default 60 check (max_advance_days between 1 and 365),
  reminder_hours            integer[] not null default '{24,2}',
  allow_staff_choice        boolean not null default true,
  require_phone             boolean not null default true,
  updated_at                timestamptz not null default now()
);
create trigger salon_settings_updated_at before update on public.salon_settings for each row execute function app.set_updated_at();

create table public.salon_hours (
  id        uuid primary key default gen_random_uuid(),
  salon_id  uuid not null references public.salons(id) on delete cascade,
  weekday   smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  opens_at  time not null,
  closes_at time not null,
  check (closes_at > opens_at),
  unique (salon_id, weekday, opens_at)
);

create table public.salon_members (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          public.member_role not null default 'staff',
  invited_email text,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (salon_id, user_id),
  check (user_id is not null or invited_email is not null)
);
create index salon_members_user_idx on public.salon_members(user_id);

create table public.salon_branding (
  salon_id        uuid primary key references public.salons(id) on delete cascade,
  logo_path       text,
  cover_path      text,
  primary_color   text not null default '#1F1F1F' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color    text not null default '#C9A27E' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_style      public.font_style not null default 'modern',
  layout          public.layout_style not null default 'classic',
  palette         text not null default 'champagne' check (length(palette) <= 30),   -- curated palette key, or 'custom'
  tagline         text check (length(tagline) <= 120),
  about           text check (length(about) <= 2000),
  booking_message text check (length(booking_message) <= 500),
  instagram       text,
  facebook        text,
  tiktok          text,
  website         text,
  whatsapp        text,
  updated_at      timestamptz not null default now()
);
create trigger salon_branding_updated_at before update on public.salon_branding for each row execute function app.set_updated_at();

create table public.salon_gallery_images (
  id           uuid primary key default gen_random_uuid(),
  salon_id     uuid not null references public.salons(id) on delete cascade,
  storage_path text not null,
  caption      text check (length(caption) <= 200),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index salon_gallery_salon_idx on public.salon_gallery_images(salon_id, sort_order);

-- Phase 2: custom domains
create table public.salon_domains (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  hostname    text not null unique,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalogue & staff
-- ---------------------------------------------------------------------------
create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null check (length(name) between 1 and 60),
  bio         text check (length(bio) <= 600),
  avatar_path text,
  colour      text not null default '#C9A27E' check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  is_bookable boolean not null default true,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (salon_id, id)
);
create index staff_salon_idx on public.staff(salon_id, sort_order);
create trigger staff_updated_at before update on public.staff for each row execute function app.set_updated_at();

create table public.staff_hours (
  id        uuid primary key default gen_random_uuid(),
  salon_id  uuid not null references public.salons(id) on delete cascade,
  staff_id  uuid not null,
  weekday   smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at   time not null,
  foreign key (salon_id, staff_id) references public.staff(salon_id, id) on delete cascade,
  check (ends_at > starts_at),
  unique (staff_id, weekday, starts_at)
);

create table public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  name       text not null check (length(name) between 1 and 60),
  sort_order integer not null default 0,
  unique (salon_id, id)
);
create index service_categories_salon_idx on public.service_categories(salon_id, sort_order);

create table public.services (
  id                    uuid primary key default gen_random_uuid(),
  salon_id              uuid not null references public.salons(id) on delete cascade,
  category_id           uuid,
  name                  text not null check (length(name) between 1 and 80),
  description           text check (length(description) <= 600),
  duration_min          integer not null check (duration_min between 5 and 600),
  buffer_after_min      integer not null default 0 check (buffer_after_min between 0 and 120),
  price_pence           integer not null check (price_pence >= 0),
  price_is_from         boolean not null default false,
  image_path            text,
  deposit_override_pence integer check (deposit_override_pence >= 0),
  online_bookable       boolean not null default true,
  active                boolean not null default true,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (salon_id, id),
  foreign key (salon_id, category_id) references public.service_categories(salon_id, id) on delete set null (category_id)
);
create index services_salon_idx on public.services(salon_id, sort_order);
create trigger services_updated_at before update on public.services for each row execute function app.set_updated_at();

create table public.staff_services (
  salon_id              uuid not null references public.salons(id) on delete cascade,
  staff_id              uuid not null,
  service_id            uuid not null,
  price_override_pence  integer check (price_override_pence >= 0),
  duration_override_min integer check (duration_override_min between 5 and 600),
  primary key (staff_id, service_id),
  foreign key (salon_id, staff_id) references public.staff(salon_id, id) on delete cascade,
  foreign key (salon_id, service_id) references public.services(salon_id, id) on delete cascade
);

create table public.blocks (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  staff_id   uuid,                                                -- null = whole salon
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  kind       public.block_kind not null default 'block',
  reason     text check (length(reason) <= 200),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (salon_id, staff_id) references public.staff(salon_id, id) on delete cascade,
  check (ends_at > starts_at)
);
create index blocks_salon_time_idx on public.blocks(salon_id, starts_at);

-- ---------------------------------------------------------------------------
-- Clients & bookings
-- ---------------------------------------------------------------------------
create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  salon_id           uuid not null references public.salons(id) on delete cascade,
  user_id            uuid references auth.users(id) on delete set null,   -- linked when they use the app
  first_name         text not null check (length(first_name) between 1 and 60),
  last_name          text check (length(last_name) <= 60),
  email              text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone              text check (phone ~ '^\+[1-9][0-9]{6,14}$'),   -- E.164
  notes              text,                                           -- salon-private
  marketing_opt_in   boolean not null default false,
  source             public.booking_source not null default 'online',
  stripe_customer_id text,                                           -- on the salon's connected account
  no_show_count      integer not null default 0,
  last_visit_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (salon_id, id),
  check (email is not null or phone is not null)
);
create unique index clients_salon_phone_key on public.clients(salon_id, phone) where phone is not null;
create unique index clients_salon_email_key on public.clients(salon_id, lower(email)) where email is not null;
create index clients_user_idx on public.clients(user_id) where user_id is not null;
create trigger clients_updated_at before update on public.clients for each row execute function app.set_updated_at();

create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  salon_id            uuid not null references public.salons(id) on delete cascade,
  client_id           uuid,
  staff_id            uuid not null,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,                -- end of the appointment itself
  buffer_after_min    integer not null default 0 check (buffer_after_min between 0 and 120),   -- clean-down time, snapshot from the service
  during              tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status              public.booking_status not null default 'confirmed',
  source              public.booking_source not null default 'online',
  reference           text not null default upper(encode(gen_random_bytes(3), 'hex')),
  total_pence         integer not null default 0 check (total_pence >= 0),
  deposit_pence       integer not null default 0 check (deposit_pence >= 0),
  deposit_paid_at     timestamptz,                 -- staff can see that a deposit was paid without seeing payment records
  client_note         text check (length(client_note) <= 500),
  internal_note       text,
  hold_expires_at     timestamptz,                 -- set while pending_payment
  manage_token        text not null default encode(gen_random_bytes(24), 'hex'),
  cancelled_at        timestamptz,
  cancelled_by        public.cancelled_by,
  cancellation_reason text,
  created_by          uuid default auth.uid() references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (salon_id, id),
  foreign key (salon_id, client_id) references public.clients(salon_id, id) on delete set null (client_id),
  foreign key (salon_id, staff_id) references public.staff(salon_id, id) on delete restrict,
  unique (salon_id, reference),
  unique (manage_token),
  check (ends_at > starts_at),
  -- The database, not the app, guarantees a stylist is never double-booked.
  exclude using gist (staff_id with =, during with &&) where (status in ('pending_payment', 'confirmed'))
);
create index bookings_salon_time_idx on public.bookings(salon_id, starts_at);
create index bookings_client_idx on public.bookings(client_id);
create index bookings_staff_time_idx on public.bookings(staff_id, starts_at) where status in ('pending_payment', 'confirmed');
create index bookings_hold_idx on public.bookings(hold_expires_at) where status = 'pending_payment';
create trigger bookings_updated_at before update on public.bookings for each row execute function app.set_updated_at();

create table public.booking_items (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null,
  salon_id     uuid not null references public.salons(id) on delete cascade,
  service_id   uuid,
  service_name text not null,                       -- snapshot at time of booking
  duration_min integer not null check (duration_min > 0),
  price_pence  integer not null check (price_pence >= 0),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  sort_order   integer not null default 0,
  foreign key (salon_id, booking_id) references public.bookings(salon_id, id) on delete cascade,
  foreign key (salon_id, service_id) references public.services(salon_id, id) on delete set null (service_id)
);
create index booking_items_booking_idx on public.booking_items(booking_id);

create table public.booking_events (
  id         bigint generated always as identity primary key,
  booking_id uuid not null,
  salon_id   uuid not null references public.salons(id) on delete cascade,
  type       text not null,
  actor      text,                                   -- 'client' | 'system' | user uuid
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (salon_id, booking_id) references public.bookings(salon_id, id) on delete cascade
);
create index booking_events_booking_idx on public.booking_events(booking_id, created_at);

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  salon_id                 uuid not null references public.salons(id) on delete cascade,
  booking_id               uuid,
  client_id                uuid,
  kind                     public.payment_kind not null,
  amount_pence             integer not null check (amount_pence >= 0),
  currency                 char(3) not null default 'GBP',
  status                   public.payment_status not null default 'requires_payment',
  stripe_payment_intent_id text unique,
  stripe_charge_id         text,
  stripe_refund_id         text,
  failure_reason           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  foreign key (salon_id, booking_id) references public.bookings(salon_id, id) on delete set null (booking_id),
  foreign key (salon_id, client_id) references public.clients(salon_id, id) on delete set null (client_id)
);
create index payments_booking_idx on public.payments(booking_id);
create trigger payments_updated_at before update on public.payments for each row execute function app.set_updated_at();

create table public.client_payment_methods (
  id                       uuid primary key default gen_random_uuid(),
  salon_id                 uuid not null references public.salons(id) on delete cascade,
  client_id                uuid not null,
  stripe_payment_method_id text not null unique,
  brand                    text,
  last4                    text,
  exp_month                smallint,
  exp_year                 smallint,
  consent_text             text not null,
  consent_at               timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  foreign key (salon_id, client_id) references public.clients(salon_id, id) on delete cascade
);
create index client_payment_methods_client_idx on public.client_payment_methods(client_id);

-- Phase 2: our flat monthly subscription (Stripe Billing)
create table public.subscriptions (
  salon_id               uuid primary key references public.salons(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id        text,
  status                 public.subscription_status not null default 'trialing',
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  trial_end              timestamptz,
  updated_at             timestamptz not null default now()
);

-- Webhook idempotency
create table public.stripe_events (
  stripe_event_id text primary key,
  type            text not null,
  account_id      text,
  processed_at    timestamptz,
  error           text,
  received_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Messaging & devices
-- ---------------------------------------------------------------------------
create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  salon_id            uuid not null references public.salons(id) on delete cascade,
  booking_id          uuid,
  client_id           uuid,
  user_id             uuid references auth.users(id) on delete cascade,   -- staff push targets
  channel             public.notification_channel not null,
  template            text not null,
  recipient           text not null,
  scheduled_for       timestamptz not null default now(),
  status              public.notification_status not null default 'queued',
  sent_at             timestamptz,
  provider_message_id text,
  error               text,
  payload             jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  foreign key (salon_id, booking_id) references public.bookings(salon_id, id) on delete cascade,
  foreign key (salon_id, client_id) references public.clients(salon_id, id) on delete cascade
);
create index notifications_due_idx on public.notifications(scheduled_for) where status = 'queued';
create index notifications_booking_idx on public.notifications(booking_id);

create table public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  expo_token   text not null unique,
  platform     text not null check (platform in ('ios', 'android', 'web')),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens(user_id);

-- Phase 2: the salon(s) a client app user has visited; is_default = the remembered one
create table public.client_salons (
  user_id       uuid not null references auth.users(id) on delete cascade,
  salon_id      uuid not null references public.salons(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  is_default    boolean not null default false,
  primary key (user_id, salon_id)
);

-- ---------------------------------------------------------------------------
-- Realtime: the dashboard diary subscribes to these (RLS applies to subscribers)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bookings, public.blocks;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Deny by default: RLS on for every table. With no policies, the anon and
-- authenticated API roles can read and write nothing. Policies that open access
-- are added in a separate, reviewed migration.
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

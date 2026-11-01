-- LINK — initial schema (Supabase / PostgreSQL 15+)
-- Principles: every table has RLS on; sensitive writes go through SECURITY DEFINER functions
-- that re-check permissions server-side; no card data, no ID documents stored here.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Reference data: cities, languages, categories (admin-managed, extensible)
-- ---------------------------------------------------------------------------
create table public.countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  min_age_default int not null default 18 check (min_age_default >= 18)
);

create table public.cities (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  country_code text not null references public.countries(code),
  timezone text not null,
  currency char(3) not null,
  lat numeric(8,5), lng numeric(8,5),
  is_priority boolean not null default false,
  priority_rank int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index cities_priority_idx on public.cities (is_priority, priority_rank);

create table public.languages (
  code text primary key check (code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text not null,
  is_ui_supported boolean not null default false
);

create table public.categories (
  id text primary key,
  sort int not null default 0,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Users & profiles (auth.users is managed by Supabase Auth: email, phone, Apple, Google)
-- ---------------------------------------------------------------------------
create type public.verification_status as enum ('none','pending','verified','failed','manual_review','revoked');
create type public.profile_visibility as enum ('public','verified_only','hidden');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  bio text check (char_length(bio) <= 300),
  birth_date date not null,                       -- never exposed: see public_profiles view
  show_age boolean not null default true,
  home_city_id text references public.cities(id),
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  music_genres text[] not null default '{}',
  outing_styles text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb, -- optional, never required
  visibility public.profile_visibility not null default 'public',
  dating_enabled boolean not null default false,
  discovery_mode text not null default 'local' check (discovery_mode in ('local','international','personal')),
  ui_language text not null default 'en' references public.languages(code),
  identity_status public.verification_status not null default 'none',
  age_verified boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adult check (birth_date <= (current_date - interval '18 years'))
);
create index profiles_city_idx on public.profiles (home_city_id) where visibility <> 'hidden';

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  city_id text not null references public.cities(id),
  starts_on date, ends_on date,
  visibility public.profile_visibility not null default 'verified_only',
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

-- Identity verification: only status + provider reference, never documents.
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('identity','age','profile','organizer')),
  provider text not null,                -- e.g. 'veriff', 'onfido', 'manual'
  provider_ref text,                     -- session/decision id at the provider
  status public.verification_status not null default 'pending',
  failure_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

-- ---------------------------------------------------------------------------
-- Staff roles & audit
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('moderator','support','finance','admin');
create table public.staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_table text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Organizers, event sources, events
-- ---------------------------------------------------------------------------
create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  legal_name text not null,
  display_name text not null,
  country_code text references public.countries(code),
  status public.verification_status not null default 'pending',
  can_sell_tickets boolean not null default false,
  payout_account_ref text,               -- e.g. Stripe Connect account id
  created_at timestamptz not null default now()
);

create table public.event_sources (
  id text primary key,                   -- 'link', 'community', 'partner:<slug>', 'api:<provider>'
  name text not null,
  kind text not null check (kind in ('link','partner','api','community')),
  terms_url text,
  display_rights boolean not null default false,
  image_rights boolean not null default false,
  resale_rights boolean not null default false,
  attribution text,
  territories text[] not null default '{}',
  sync_interval interval,
  is_active boolean not null default true
);

create type public.ticketing_mode as enum ('link_operated','partner','third_party_api','none');
create type public.event_status as enum ('draft','pending_review','published','cancelled','rejected');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.event_sources(id),
  external_id text,
  organizer_id uuid references public.organizers(id),
  city_id text not null references public.cities(id),
  category_id text not null references public.categories(id),
  title text not null,
  description text,
  venue_name text,
  area text,
  lat numeric(8,5), lng numeric(8,5),
  starts_at timestamptz not null,
  ends_at timestamptz,
  min_age int not null default 18 check (min_age >= 18),
  price_min numeric(10,2),               -- null = unknown, never invented
  currency char(3),
  availability text not null default 'unknown' check (availability in ('verified','unknown','sold_out')),
  accessibility jsonb not null default '{}'::jsonb,
  vibe text[] not null default '{}',
  ticketing public.ticketing_mode not null default 'none',
  sale_enabled boolean not null default false,  -- only true once contract + integration are confirmed
  status public.event_status not null default 'pending_review',
  last_synced_at timestamptz,
  dedupe_key text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);
create index events_city_time_idx on public.events (city_id, starts_at) where status = 'published';
create index events_category_idx on public.events (category_id);
create index events_dedupe_idx on public.events (dedupe_key);

-- ---------------------------------------------------------------------------
-- Community / private outings and groups
-- ---------------------------------------------------------------------------
create type public.outing_kind as enum ('public','private','organizer');
create table public.outings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  kind public.outing_kind not null,
  title text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 600),
  rules text check (char_length(rules) <= 160),
  city_id text not null references public.cities(id),
  category_id text not null references public.categories(id),
  meeting_place text,                   -- public place, never a home address
  starts_at timestamptz not null,
  capacity int not null default 6 check (capacity between 2 and 500),
  status text not null default 'pending_review' check (status in ('pending_review','published','private','cancelled','rejected')),
  created_at timestamptz not null default now()
);
create index outings_city_time_idx on public.outings (city_id, starts_at) where status = 'published';

create table public.outing_members (
  outing_id uuid not null references public.outings(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('creator','organizer','member')),
  status text not null default 'joined' check (status in ('requested','joined','left','removed')),
  joined_at timestamptz not null default now(),
  primary key (outing_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- Invitations, blocks, reports, moderation
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  outing_id uuid references public.outings(id) on delete cascade,
  note text check (char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id),
  check (event_id is not null or outing_id is not null)
);
create index invitations_recipient_idx on public.invitations (recipient_id, status);
create index invitations_sender_day_idx on public.invitations (sender_id, created_at);
create unique index invitations_no_dup_pending on public.invitations (sender_id, recipient_id, coalesce(event_id, outing_id)) where status = 'pending';

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile','message','event','outing','organizer')),
  target_id text not null,
  reason text not null check (reason in ('fake','harassment','spam','underage','unsafe','impersonation','other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','in_review','actioned','dismissed')),
  handled_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  level text not null check (level in ('warning','restriction','suspension','ban')),
  reason text not null,
  report_id uuid references public.reports(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  appeal_status text not null default 'none' check (appeal_status in ('none','open','upheld','overturned')),
  decided_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct','outing')),
  outing_id uuid references public.outings(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  archived boolean not null default false,
  muted boolean not null default false,
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index messages_conv_time_idx on public.messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Ticketing: orders, payments, refunds, tickets, scans (no card data, ever)
-- ---------------------------------------------------------------------------
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  currency char(3) not null,
  capacity int check (capacity >= 0),
  sold int not null default 0 check (sold >= 0),
  sales_start timestamptz, sales_end timestamptz,
  check (capacity is null or sold <= capacity)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  event_id uuid not null references public.events(id),
  status text not null default 'pending' check (status in ('pending','held','paid','failed','cancelled','refunded','partially_refunded','disputed')),
  currency char(3) not null,
  subtotal numeric(10,2) not null,
  fees numeric(10,2) not null default 0,
  taxes numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  hold_expires_at timestamptz,
  environment text not null default 'test' check (environment in ('test','live')),
  created_at timestamptz not null default now(),
  check (total = subtotal + fees + taxes)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id),
  quantity int not null check (quantity between 1 and 10),
  unit_price numeric(10,2) not null
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null,                    -- 'stripe'
  provider_payment_id text not null,         -- e.g. PaymentIntent id
  status text not null check (status in ('requires_action','processing','succeeded','failed','refunded','disputed')),
  amount numeric(10,2) not null,
  currency char(3) not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create table public.webhook_events (            -- idempotency for provider webhooks
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider_refund_id text,
  amount numeric(10,2) not null check (amount > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  ticket_type_id uuid not null references public.ticket_types(id),
  holder_id uuid not null references public.profiles(id),
  token_hash bytea not null unique,          -- sha256 of the random token embedded in the QR; raw token never stored
  status text not null default 'valid' check (status in ('valid','scanned','revoked','transferred')),
  issued_at timestamptz not null default now(),
  scanned_at timestamptz
);
create table public.ticket_scans (
  id bigint generated always as identity primary key,
  ticket_id uuid references public.tickets(id),
  scanner_id uuid references auth.users(id),
  result text not null check (result in ('ok','already_scanned','revoked','unknown','wrong_event')),
  scanned_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notification_prefs (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  invitations boolean not null default true,
  messages boolean not null default true,
  event_changes boolean not null default true,
  reminders boolean not null default true,
  tickets boolean not null default true,
  group_updates boolean not null default true,
  marketing boolean not null default false,  -- opt-in only
  quiet_from time, quiet_to time
);
create table public.push_tokens (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now(),
  primary key (profile_id, token)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

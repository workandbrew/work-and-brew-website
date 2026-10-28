-- Work & Brew — Scout SMS tables
-- Run once in the Supabase SQL editor (Database → SQL editor → New query), after schema.sql.
--
--   signup_requests  new opt-ins from /scout-signup, waiting for Den's approval ("pending requests")
--   sms_contacts     approved team members — the single source of truth the send endpoint texts
--   sms_messages     log of every text actually sent (who, what, Twilio SID, status)
--
-- Only the website's anonymous visitors can INSERT a signup request. Everything else (reading
-- requests, the sms_contacts roster, the send log) is server-only: the /api functions use the
-- service-role key, which bypasses RLS. No browser can read phone numbers.

-- ---------------------------------------------------------------------------------------------
-- signup_requests
-- ---------------------------------------------------------------------------------------------
create table if not exists public.signup_requests (
  id uuid default gen_random_uuid() primary key,
  name text not null check (char_length(name) between 1 and 100),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),  -- E.164
  sms_consent boolean not null default false,
  consent_text text,                       -- the exact checkbox wording they agreed to
  consent_at timestamptz,                  -- set by the server (trigger below), never the browser
  source text not null default 'scout-signup',
  user_agent text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  -- consenting to texts requires a phone number and the consent wording
  check (not sms_consent or (phone is not null and consent_text is not null))
);

alter table public.signup_requests enable row level security;

create policy "Anyone can submit a pending scout signup"
  on public.signup_requests for insert to anon, authenticated
  with check (status = 'pending' and reviewed_at is null);

-- Consent timestamp comes from the database clock, so it can't be back-dated from the browser.
create or replace function public.stamp_signup_consent()
returns trigger as $$
begin
  new.consent_at := case when new.sms_consent then now() else null end;
  return new;
end;
$$ language plpgsql;

drop trigger if exists signup_requests_stamp_consent on public.signup_requests;
create trigger signup_requests_stamp_consent
  before insert on public.signup_requests
  for each row execute function public.stamp_signup_consent();

-- ---------------------------------------------------------------------------------------------
-- sms_contacts (named so it never collides with any other "scouts" table)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.sms_contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text unique check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  role text not null default 'Cafe Scout',
  chapters text[] not null default '{}',   -- e.g. {Bronx,Queens} or {Manhattan-UWS}
  sms_opt_in boolean not null default false,
  consent_at timestamptz,                  -- compliance record: when they opted in
  consent_text text,                       -- ...and to what wording
  consent_source text,                     -- 'scout-signup form', 'pre-form team consent', ...
  signup_request_id uuid references public.signup_requests on delete set null,
  active boolean not null default true,    -- false = off the team (kept for the record)
  opted_out_at timestamptz,                -- set automatically when Twilio reports they replied STOP
  created_at timestamptz not null default now()
);

alter table public.sms_contacts enable row level security;
-- (no policies on purpose: server-only)

-- ---------------------------------------------------------------------------------------------
-- sms_messages (send log)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.sms_messages (
  id uuid default gen_random_uuid() primary key,
  scout_id uuid references public.sms_contacts on delete set null,
  to_phone text not null,
  body text not null,
  twilio_sid text,
  status text not null,                    -- 'queued' / 'accepted' on success, 'failed' otherwise
  error text,
  sent_by text,                            -- 'gwen', 'cli', 'schedule', 'shortcut', ...
  created_at timestamptz not null default now()
);

alter table public.sms_messages enable row level security;
-- (no policies on purpose: server-only)

-- ---------------------------------------------------------------------------------------------
-- Team Hub (/team): who may use it, and grouping one send to many people in the log
-- ---------------------------------------------------------------------------------------------
create table if not exists public.hub_admins (
  email text primary key,                  -- the email they log into the website with
  name text not null,
  role text,
  created_at timestamptz not null default now()
);
alter table public.hub_admins enable row level security;  -- server-only
grant all on public.hub_admins to service_role;

alter table public.sms_messages add column if not exists batch_id uuid;
alter table public.sms_messages add column if not exists scheduled_for timestamptz;  -- scheduled-send release time (null = immediate)
create index if not exists sms_messages_created_at_idx on public.sms_messages (created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Team Hub v2: saved message templates
-- ---------------------------------------------------------------------------------------------
create table if not exists public.sms_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null check (char_length(name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 480),
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.sms_templates enable row level security;  -- server-only
grant all on public.sms_templates to service_role;

-- ---------------------------------------------------------------------------------------------
-- Team Hub v3: scheduled weekly texts, welcome series, manual social numbers
-- ---------------------------------------------------------------------------------------------
create table if not exists public.sms_schedules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  body text not null check (char_length(body) between 1 and 480),
  recipients text[] not null,              -- same values the send box uses: "all", "group:scouts", "Bronx", contact ids
  weekday smallint not null check (weekday between 0 and 6),  -- 0 = Sunday, New York time
  active boolean not null default true,
  last_sent_on date,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.sms_schedules enable row level security;  -- server-only
grant all on public.sms_schedules to service_role;

alter table public.sms_contacts add column if not exists welcome_started_at timestamptz;
alter table public.sms_contacts add column if not exists welcome_step smallint not null default 0;

create table if not exists public.growth_manual (
  id uuid default gen_random_uuid() primary key,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'lemon8')),
  followers integer not null check (followers >= 0),
  recorded_on date not null default current_date,
  recorded_by text,
  created_at timestamptz not null default now()
);
alter table public.growth_manual enable row level security;  -- server-only
grant all on public.growth_manual to service_role;

-- Refreshed access tokens for growth sources (Instagram tokens expire every 60 days)
create table if not exists public.growth_tokens (
  platform text primary key,
  token text not null,
  refreshed_at timestamptz not null default now()
);
alter table public.growth_tokens enable row level security;  -- server-only
grant all on public.growth_tokens to service_role;

-- ---------------------------------------------------------------------------------------------
-- Team-only navbar links: everyone here sees "Café Map"; hub_admins also see "Team Hub".
-- ---------------------------------------------------------------------------------------------
create table if not exists public.team_access (
  email text primary key,                  -- the email they log into the website with
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.team_access enable row level security;  -- server-only
grant all on public.team_access to service_role;

-- ---------------------------------------------------------------------------------------------
-- Events (Team Hub → Events tab): meetups, pop-ups, café takeovers. One row per event,
-- with a checklist stored as JSON [{ "text": "Book the venue", "done": false }, ...].
-- ---------------------------------------------------------------------------------------------
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  starts_at timestamptz,                   -- when it happens (null = date not picked yet)
  venue text,                              -- café name or address
  host text,                               -- who is running it on the day
  status text not null default 'idea' check (status in ('idea', 'planning', 'confirmed', 'done', 'cancelled')),
  headcount_target integer check (headcount_target is null or headcount_target >= 0),
  notes text,
  checklist jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;  -- server-only (the hub API uses the service role)
grant all on public.events to service_role;

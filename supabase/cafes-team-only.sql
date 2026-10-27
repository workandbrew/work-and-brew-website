-- Lock the cafes table to the Work & Brew team (team_access + hub_admins emails).
-- Run once in the Supabase SQL editor. The website's server (service role) is not affected.

create or replace function public.is_team_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.team_access where lower(email) = lower(auth.jwt() ->> 'email'))
      or exists (select 1 from public.hub_admins  where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

alter table public.cafes enable row level security;

drop policy if exists "Team members can use cafes" on public.cafes;
create policy "Team members can use cafes" on public.cafes
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- Restrictive: whatever other policies exist, non-team users are always blocked.
drop policy if exists "Only team members" on public.cafes;
create policy "Only team members" on public.cafes as restrictive
  for all to anon, authenticated using (public.is_team_member()) with check (public.is_team_member());

notify pgrst, 'reload schema';

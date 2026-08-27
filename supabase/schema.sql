-- Work & Brew — Supabase schema
-- Run this once in the Supabase SQL editor (Database → SQL editor → New query).

-- profiles: one row per user, created automatically on signup
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- auto-create a profile row when someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- saved lists: the dashboard's lists ("My Favorites", etc.)
create table if not exists public.saved_lists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  position int default 0,
  created_at timestamptz default now()
);

alter table public.saved_lists enable row level security;

create policy "Users manage their own lists"
  on public.saved_lists for all using (auth.uid() = user_id);

-- one row per café inside a list — mirrors the markers.csv columns we care about
create table if not exists public.list_cafes (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references public.saved_lists on delete cascade not null,
  cafe_name text not null,
  address text not null,
  county text,
  latitude double precision,
  longitude double precision,
  added_at timestamptz default now(),
  unique (list_id, cafe_name, address)
);

alter table public.list_cafes enable row level security;

create policy "Users manage cafés in their own lists"
  on public.list_cafes for all using (
    auth.uid() = (select user_id from public.saved_lists where id = list_id)
  );

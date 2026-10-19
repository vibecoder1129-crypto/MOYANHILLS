-- MOYEN HILLS — customer accounts
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- Saved customer details, one row per account.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  address text,
  city text,
  postcode text,
  country text default 'Latvia',
  updated_at timestamptz not null default now()
);

-- Orders placed while signed in.
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  items jsonb not null,            -- [{ "name": "ART WILL TEE", "size": "M", "qty": 1, "price": 35 }]
  subtotal numeric(10, 2) not null,
  currency text not null default 'EUR',
  -- received → paid → shipped (change it in Table Editor; the customer sees it on their account page)
  status text not null default 'received' check (status in ('received', 'paid', 'shipped', 'cancelled')),
  full_name text,
  email text,
  phone text,
  address text,
  city text,
  postcode text,
  country text,
  note text
);
create index if not exists orders_user_created on public.orders (user_id, created_at desc);

-- Each customer can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.orders enable row level security;

drop policy if exists "own profile: read" on public.profiles;
drop policy if exists "own profile: insert" on public.profiles;
drop policy if exists "own profile: update" on public.profiles;
create policy "own profile: read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile: insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile: update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own orders: read" on public.orders;
drop policy if exists "own orders: insert" on public.orders;
create policy "own orders: read"   on public.orders for select using (auth.uid() = user_id);
-- Customers can add an order but never change its status; only you can, from the dashboard.
create policy "own orders: insert" on public.orders for insert with check (auth.uid() = user_id and status = 'received');

-- Create an empty profile automatically when someone signs up (keeps the name from Google/Apple).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

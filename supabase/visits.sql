-- Visitor counts for the admin "Visitors" tab. Run once in the Supabase SQL Editor (paste the
-- contents of this file), after privacy.sql. Safe to re-run.
--
-- Privacy by design, so no cookie banner is needed:
--  * no cookies, nothing stored in the visitor's browser;
--  * no IP address and no browser string are stored. A visitor is a one-way hash of
--    (secret salt + date + IP fingerprint + browser string). The date is part of it, so the
--    same person can't be followed from one day to the next: we count "people per day".
--  * stored per page view: time, page path, where they came from (just a name like
--    "instagram" or a website domain), device type (phone / tablet / computer);
--  * kept for 13 months, then deleted.
-- Owners and editors read the numbers through visit_stats(); nobody can read the raw rows
-- from the website.

create table if not exists public.visits (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null default (now() at time zone 'Europe/Riga')::date,
  path text not null check (char_length(path) <= 200),
  source text not null default 'direct' check (char_length(source) <= 80),
  device text not null default 'computer' check (device in ('phone', 'tablet', 'computer')),
  visitor text not null
);
create index if not exists visits_day on public.visits (day);
create index if not exists visits_visitor on public.visits (visitor, at);
alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated; -- only through the functions below

-- Called once per page view by app.js
create or replace function public.track_visit(p_path text, p_source text default '', p_device text default 'computer')
returns void language plpgsql volatile security definer set search_path = public, private as $$
declare
  h jsonb := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  ua text := coalesce(h ->> 'user-agent', '');
  today date := (now() at time zone 'Europe/Riga')::date;
  v text;
  src text := lower(left(coalesce(p_source, ''), 80));
  pth text := left(coalesce(p_path, '/'), 200);
begin
  -- Search engines, link previews and other robots are not people
  if ua = '' or ua ~* '(bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|telegram|curl|wget|python|java/|monitor|pingdom)' then
    return;
  end if;
  if pth !~ '^/' then pth := '/'; end if;
  pth := regexp_replace(pth, '\.html$', '');
  if pth = '/index' then pth := '/'; end if;
  src := regexp_replace(src, '[^a-z0-9._-]', '', 'g');
  if src = '' then src := 'direct'; end if;
  if p_device not in ('phone', 'tablet', 'computer') then p_device := 'computer'; end if;

  v := left(encode(sha256(convert_to(
    (select value from private.secrets where name = 'fingerprint_salt') || ':visit:' || today::text || ':' ||
    public.client_hash() || ':' || ua, 'UTF8')), 'hex'), 32);

  -- At most 120 page views an hour from one visitor (stops someone inflating the numbers)
  if (select count(*) from public.visits where visitor = v and at > now() - interval '1 hour') >= 120 then
    return;
  end if;

  insert into public.visits (day, path, source, device, visitor) values (today, pth, src, p_device, v);

  -- Now and then, delete what is older than 13 months
  if random() < 0.01 then
    delete from public.visits where at < now() - interval '13 months';
  end if;
end;
$$;
revoke execute on function public.track_visit(text, text, text) from public;
grant execute on function public.track_visit(text, text, text) to anon, authenticated;

-- What the admin shows: owners and editors only
create or replace function public.visit_stats(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d integer := least(greatest(coalesce(p_days, 30), 1), 400);
  today date := (now() at time zone 'Europe/Riga')::date;
  first date := today - (d - 1);
  r jsonb;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  with v as (select * from public.visits where day >= first)
  select jsonb_build_object(
    'days', d,
    'today', (select jsonb_build_object('visitors', count(distinct visitor), 'views', count(*)) from public.visits where day = today),
    'total', (select jsonb_build_object('visitors', coalesce(sum(n), 0), 'views', (select count(*) from v))
                from (select count(distinct visitor) n from v group by day) x),
    'per_day', (select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'visitors', coalesce(x.visitors, 0), 'views', coalesce(x.views, 0)) order by g.day), '[]')
                from (select generate_series(first, today, interval '1 day')::date as day) g
                left join (select day, count(distinct visitor) visitors, count(*) views from v group by day) x using (day)),
    'pages', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views, 'visitors', visitors) order by views desc), '[]')
              from (select path, count(*) views, count(distinct day::text || visitor) visitors from v group by path order by 2 desc limit 15) p),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors) order by visitors desc), '[]')
                -- each visitor counts once a day, for where their first page view that day came from
                from (select source, count(*) visitors from (select distinct on (day, visitor) source from v order by day, visitor, id) f
                      group by source order by 2 desc limit 15) s),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('device', device, 'visitors', visitors) order by visitors desc), '[]')
                from (select device, count(distinct day::text || visitor) visitors from v group by device) dv)
  ) into r;
  return r;
end;
$$;
revoke execute on function public.visit_stats(integer) from public, anon;
grant execute on function public.visit_stats(integer) to authenticated;

-- Check: should return one row with track_visit and visit_stats
select string_agg(proname, ', ') as functions from pg_proc where proname in ('track_visit', 'visit_stats');

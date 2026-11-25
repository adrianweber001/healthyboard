-- =====================================================================
-- Kevin muss in 30 Tagen für Cäsar ganz Ägypten vom Sand befreien
-- Supabase-Setup: Tabelle, Row Level Security, Plausibilisierung, Rangliste
--
-- Komplett im Supabase SQL Editor ausführen. Das Skript kann gefahrlos
-- mehrmals ausgeführt werden (idempotent).
--
-- WICHTIG: Die Werte der Upgrades (Preise, +Sand) müssen zu
-- public/js/game.js passen.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tabelle für Spielstände (ein Datensatz pro Benutzer)
-- ---------------------------------------------------------------------
create table if not exists public.game_saves (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  username     text not null,
  gold         double precision not null default 0,
  gold_earned  double precision not null default 0,   -- insgesamt verdientes Gold (nur steigend)
  sand_removed double precision not null default 0,   -- netto entfernter Sand (Rangliste)
  upgrades     jsonb not null default '{}'::jsonb,
  day          integer not null default 1,
  day_seconds  double precision not null default 0,
  sleeping     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint game_saves_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

create unique index if not exists game_saves_username_lower_idx on public.game_saves (lower(username));
create index if not exists game_saves_sand_idx on public.game_saves (sand_removed desc);

-- ---------------------------------------------------------------------
-- 2) Row Level Security: jeder sieht und ändert nur seinen eigenen Stand
-- ---------------------------------------------------------------------
alter table public.game_saves enable row level security;

drop policy if exists "game_saves_select_own" on public.game_saves;
drop policy if exists "game_saves_insert_own" on public.game_saves;
drop policy if exists "game_saves_update_own" on public.game_saves;

create policy "game_saves_select_own" on public.game_saves
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "game_saves_insert_own" on public.game_saves
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "game_saves_update_own" on public.game_saves
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Kein DELETE für Spieler. Anonyme Besucher dürfen gar nichts.
revoke all on public.game_saves from anon;
revoke all on public.game_saves from authenticated;
grant select, insert, update on public.game_saves to authenticated;

-- ---------------------------------------------------------------------
-- 3) Hilfsfunktionen für die Plausibilisierung
-- ---------------------------------------------------------------------

-- Nur bekannte Upgrades, ganze Zahlen, Obergrenzen.
create or replace function public.kevin_sanitize_upgrades(u jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  k text;
  lvl integer;
  max_lvl integer;
begin
  if u is null or jsonb_typeof(u) <> 'object' then
    return result;
  end if;
  foreach k in array array['eimer','schaufel','ventilator','kamel','bagger','zauberer','raumschiff'] loop
    max_lvl := case when k in ('kamel', 'zauberer') then 1 else 500 end;
    begin
      lvl := coalesce(floor((u ->> k)::numeric)::integer, 0);
    exception when others then
      lvl := 0;
    end;
    lvl := greatest(0, least(max_lvl, lvl));
    if lvl > 0 then
      result := result || jsonb_build_object(k, lvl);
    end if;
  end loop;
  return result;
end;
$$;

-- Wie viel Gold wurde insgesamt für diese Upgrades ausgegeben? (Preis * 1,15^Stufe)
create or replace function public.kevin_upgrade_spent(u jsonb)
returns double precision
language sql
immutable
set search_path = public
as $$
  select coalesce(sum(floor(d.base * power(1.15::double precision, g.n))), 0)::double precision
  from (values
    ('eimer', 10), ('schaufel', 50), ('ventilator', 200), ('kamel', 300),
    ('bagger', 1000), ('zauberer', 5000), ('raumschiff', 20000)
  ) as d(id, base)
  cross join lateral generate_series(0, coalesce((u ->> d.id)::integer, 0) - 1) as g(n);
$$;

-- Großzügige Obergrenze: maximal mögliche Sand-/Goldrate pro Sekunde.
-- 25 Tipps/s * Sand pro Tipp (x10 mit Zauberer) + Automatik + Kamel.
create or replace function public.kevin_max_rate(u jsonb)
returns double precision
language sql
immutable
set search_path = public
as $$
  select
    25.0 * (1
            + coalesce((u ->> 'eimer')::integer, 0)
            + 5 * coalesce((u ->> 'schaufel')::integer, 0)
            + 50 * coalesce((u ->> 'bagger')::integer, 0))
         * (case when coalesce((u ->> 'zauberer')::integer, 0) > 0 then 10 else 1 end)
    + 2 * coalesce((u ->> 'ventilator')::integer, 0)
    + 500 * coalesce((u ->> 'raumschiff')::integer, 0)
    + 3;
$$;

-- Benutzername aus der internen Pseudo-E-Mail ableiten (benutzername@kevin-game.local)
create or replace function public.kevin_username_for(email text, wanted text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when wanted is not null and lower(wanted) = lower(split_part(coalesce(email, ''), '@', 1)) then wanted
    else split_part(coalesce(email, ''), '@', 1)
  end;
$$;

-- ---------------------------------------------------------------------
-- 4) Trigger: Spielstand serverseitig plausibilisieren
-- ---------------------------------------------------------------------
create or replace function public.kevin_validate_save()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  elapsed     double precision;
  allowed     double precision;
  earned      double precision;
  spent_delta double precision;
  max_gold    double precision;
  tolerance   double precision;
  k           text;
begin
  if tg_op = 'INSERT' then
    -- Neue Spielstände starten immer bei null – egal, was der Client schickt.
    if auth.uid() is not null then
      new.username := public.kevin_username_for(auth.jwt() ->> 'email', new.username);
    end if;
    new.gold := 0;
    new.gold_earned := 0;
    new.sand_removed := 0;
    new.upgrades := '{}'::jsonb;
    new.day := 1;
    new.day_seconds := 0;
    new.sleeping := false;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- Unveränderliche Spalten
  new.user_id := old.user_id;
  new.username := old.username;
  new.created_at := old.created_at;

  -- Upgrades bereinigen, kein "Zurückverkaufen"
  new.upgrades := public.kevin_sanitize_upgrades(new.upgrades);
  for k in select jsonb_object_keys(old.upgrades) loop
    if coalesce((new.upgrades ->> k)::integer, 0) < coalesce((old.upgrades ->> k)::integer, 0) then
      new.upgrades := new.upgrades || jsonb_build_object(k, (old.upgrades ->> k)::integer);
    end if;
  end loop;

  -- Wie viel Gold kann seit dem letzten Speichern realistisch verdient worden sein?
  -- (max. 8 Std. Offline-Zeit + 5 Min. Puffer)
  elapsed := extract(epoch from (now() - old.updated_at));
  elapsed := greatest(1, least(elapsed, 8 * 3600 + 300));
  allowed := public.kevin_max_rate(new.upgrades) * elapsed * 1.5 + 1000;

  earned := coalesce(new.gold_earned, old.gold_earned) - old.gold_earned;
  earned := greatest(0, least(earned, allowed));
  new.gold_earned := old.gold_earned + earned;

  -- Gold darf höchstens: alter Stand + verdient - ausgegeben
  spent_delta := public.kevin_upgrade_spent(new.upgrades) - public.kevin_upgrade_spent(old.upgrades);
  max_gold := old.gold + earned - spent_delta;
  tolerance := 2 + abs(old.gold) * 1e-9;

  if max_gold < -tolerance then
    -- Upgrades waren nicht bezahlbar -> Käufe verwerfen
    new.gold := least(greatest(coalesce(new.gold, 0), 0) + spent_delta, old.gold + earned);
    new.upgrades := old.upgrades;
  elsif coalesce(new.gold, 0) > max_gold + tolerance then
    -- Unrealistischer Sprung -> auf das Maximum kappen
    new.gold := greatest(max_gold, 0);
  end if;
  new.gold := greatest(new.gold, 0);

  -- Entfernter Sand kann nicht schneller steigen als verdient wurde (fallen darf er: Sandsturm)
  new.sand_removed := greatest(0, least(coalesce(new.sand_removed, old.sand_removed), old.sand_removed + earned));

  -- Tage: höchstens ein Tag pro Minute weiter, nie zurück
  new.day := greatest(old.day, least(coalesce(new.day, old.day), old.day + 1 + floor(elapsed / 60)::integer, 100000));
  new.day_seconds := greatest(0, least(coalesce(new.day_seconds, 0), 180));
  new.sleeping := coalesce(new.sleeping, false);

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kevin_validate_save on public.game_saves;
create trigger kevin_validate_save
  before insert or update on public.game_saves
  for each row execute function public.kevin_validate_save();

-- ---------------------------------------------------------------------
-- 5) Neuer Account -> Spielstand automatisch anlegen
--    Nur Pseudo-E-Mails des Spiels sind erlaubt.
--    Wenn du PSEUDO_EMAIL_DOMAIN änderst, hier ebenfalls anpassen!
-- ---------------------------------------------------------------------
create or replace function public.kevin_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  if new.email is null or lower(new.email) not like '%@kevin-game.local' then
    raise exception 'Nur Spiel-Accounts erlaubt';
  end if;
  uname := public.kevin_username_for(new.email, new.raw_user_meta_data ->> 'username');
  if uname !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Ungültiger Benutzername';
  end if;
  insert into public.game_saves (user_id, username)
  values (new.id, uname)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.kevin_handle_new_user() from public, anon, authenticated;

drop trigger if exists kevin_on_auth_user_created on auth.users;
create trigger kevin_on_auth_user_created
  after insert on auth.users
  for each row execute function public.kevin_handle_new_user();

-- ---------------------------------------------------------------------
-- 6) Spielstand laden (inkl. Offline-Zeit, vom Server berechnet)
-- ---------------------------------------------------------------------
create or replace function public.load_game()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select to_jsonb(g)
         || jsonb_build_object(
              'offline_seconds', greatest(0, extract(epoch from (now() - g.updated_at))),
              'server_time', now()
            )
  from public.game_saves g
  where g.user_id = auth.uid();
$$;

revoke all on function public.load_game() from public, anon;
grant execute on function public.load_game() to authenticated;

-- ---------------------------------------------------------------------
-- 7) Rangliste: Top 20 – nur Benutzername + Sand, sonst nichts
-- ---------------------------------------------------------------------
create or replace function public.get_leaderboard()
returns table (rank bigint, username text, sand_removed double precision)
language sql
stable
security definer
set search_path = public
as $$
  select row_number() over (order by g.sand_removed desc, g.created_at asc) as rank,
         g.username,
         floor(g.sand_removed) as sand_removed
  from public.game_saves g
  order by g.sand_removed desc, g.created_at asc
  limit 20;
$$;

create or replace function public.get_my_rank()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) + 1
  from public.game_saves g
  where g.sand_removed > (select m.sand_removed from public.game_saves m where m.user_id = auth.uid());
$$;

revoke all on function public.get_leaderboard() from public, anon;
revoke all on function public.get_my_rank() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;
grant execute on function public.get_my_rank() to authenticated;

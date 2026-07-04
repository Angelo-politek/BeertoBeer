-- ============================================================================
-- MIGRATION — Gamification, Community & Onboarding (rilancio beta)
--
-- IDEMPOTENTE: rieseguibile senza errori (create or replace / if not exists /
-- on conflict do nothing / drop ... if exists). Da incollare nella SQL Editor
-- di Supabase. ESEGUIRLA PRIMA di pubblicare l'OTA: i client aggiornati
-- chiamano le RPC qui sotto.
--
-- Presuppone lo schema base già applicato (supabase/schema.sql): tabelle users,
-- orders, credit_transactions, funzioni push_to_users, pair_blocked, ecc.
--
-- Contenuto:
--   1. Economia    — welcome 20→10, award_tokens()
--   2. Badge       — tabelle badges/user_badges, unlock_badge(), catalogo
--   3. Livelli     — level_for_scambi(), grant_level_bonus()
--   4. Karma       — colonna generata su users (consegne vs ordini)
--   5. Zone        — zone_holders, conquista quartieri
--   6. Aggancio    — gamify_on_confirm() dentro confirm_order (badge/notturno/livello/zona)
--   7. Infame      — badge Moretti alla creazione ordine
--   8. Onboarding  — colonna onboarding_completed + complete_onboarding()
--   9. Profili     — interessi, cerco_compagnia (+ public_profiles)
--  10. Complimenti — tabella compliments
--  11. Eventi      — events / event_participants (giri di birra di gruppo)
--  12. Missioni    — user_missions (leggero)
--  13. Leaderboard — view leaderboard_citta
--  14. Referral    — referred_by + apply_referral()
--  15. Bacheca     — view community_feed
-- ============================================================================

-- ============================================================
-- 1. ECONOMIA
-- ============================================================

-- Welcome bonus 20 → 10, ora tracciato nel ledger (tipo 'welcome').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nome, data_nascita, crediti_saldo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Utente'),
    (new.raw_user_meta_data->>'data_nascita')::date,
    -- Credito di benvenuto: pochi PeroniToken per i primi giri. Il resto si
    -- guadagna contribuendo (consegne, badge, inviti). I beta esistenti
    -- mantengono il saldo che hanno già: questo vale solo per i NUOVI iscritti.
    10
  );
  -- Traccia il benvenuto nel ledger (conio di sistema: from_user_id = null).
  -- Best-effort: se il ledger fallisse, la registrazione NON deve rompersi.
  begin
    insert into public.credit_transactions (from_user_id, to_user_id, importo, tipo)
    values (null, new.id, 10, 'welcome');
  exception when others then
    null;
  end;
  return new;
end;
$$;

-- Punto d'ingresso UNICO per ogni guadagno che non sia una consegna.
-- Aggiunge PeroniToken al saldo e scrive una riga di ledger (conio di sistema).
-- p_tipo: 'badge' | 'livello' | 'missione' | 'notturno' | 'referral' | 'welcome' | 'zona'
create or replace function public.award_tokens(
  p_user uuid,
  p_amount int,
  p_tipo text,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or coalesce(p_amount, 0) <= 0 then return; end if;
  update public.users set crediti_saldo = crediti_saldo + p_amount where id = p_user;
  insert into public.credit_transactions (from_user_id, to_user_id, importo, tipo)
  values (null, p_user, p_amount, p_tipo);
end;
$$;

-- ============================================================
-- 2. BADGE
-- ============================================================

create table if not exists public.badges (
  key         text primary key,
  nome        text not null,
  descrizione text not null,
  emoji       text not null default '🏅',
  reward_pt   int  not null default 0,
  categoria   text not null default 'milestone'
);

alter table public.badges enable row level security;

drop policy if exists "badges_public_read" on public.badges;
create policy "badges_public_read" on public.badges
  for select to authenticated using (true);

create table if not exists public.user_badges (
  user_id     uuid not null references public.users(id) on delete cascade,
  badge_key   text not null references public.badges(key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.user_badges enable row level security;

-- Lettura pubblica: i badge sono status sociale, si vedono sui profili altrui.
drop policy if exists "user_badges_public_read" on public.user_badges;
create policy "user_badges_public_read" on public.user_badges
  for select to authenticated using (true);

-- Nessuna INSERT/UPDATE/DELETE policy: si scrive solo via unlock_badge (definer).

-- Catalogo badge (seed idempotente). MIRROR di constants/branding.ts (BADGES).
insert into public.badges (key, nome, descrizione, emoji, reward_pt, categoria) values
  ('first_delivery', 'Primo Giro',            'Hai consegnato la tua prima birra. Ora sei uno di noi.',        '🚴', 3,  'delivery'),
  ('first_request',  'Prima Sete',            'Hai completato la tua prima richiesta.',                        '🙏', 1,  'milestone'),
  ('deliveries_5',   'Fattorino della Peroni','5 giri consegnati. Il quartiere ti ringrazia.',                 '🏅', 5,  'delivery'),
  ('deliveries_10',  'Spaccia Peroni',        '10 giri consegnati. Sei una colonna della community.',          '🥇', 8,  'delivery'),
  ('deliveries_25',  'Leggenda del Nastro',   '25 giri consegnati. Rispetto.',                                 '🏆', 15, 'delivery'),
  ('night_owl',      'Giro di Notte',         'Hai consegnato dopo le 22. Eroe notturno.',                     '🦉', 3,  'delivery'),
  ('social_butterfly','Anima della Compagnia','Hai conosciuto almeno 5 persone nuove.',                        '🦋', 5,  'social'),
  ('profile_complete','Faccia Pulita',        'Foto, bio e preferenze: profilo completo.',                     '✨', 2,  'social'),
  ('zone_king',      'Re del Quartiere',      'Hai conquistato una zona della tua città.',                     '👑', 10, 'milestone'),
  ('ambassador',     'Ambasciatore Peroni',   'Hai invitato un amico nella community.',                        '🤝', 5,  'social'),
  ('infame',         'Infame',                'Hai ordinato delle Moretti. Le Moretti qui sono bandite. Vergogna.', '🚨', 0, 'infamia')
on conflict (key) do update
  set nome = excluded.nome,
      descrizione = excluded.descrizione,
      emoji = excluded.emoji,
      reward_pt = excluded.reward_pt,
      categoria = excluded.categoria;

-- Sblocca un badge per un utente (idempotente). Se è NUOVO, accredita il reward
-- e manda una push. Rieseguirla non ri-premia (on conflict do nothing).
create or replace function public.unlock_badge(p_user uuid, p_badge_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int := 0;
  v_reward int;
  v_nome text;
  v_emoji text;
begin
  if p_user is null then return; end if;

  insert into public.user_badges (user_id, badge_key)
  values (p_user, p_badge_key)
  on conflict (user_id, badge_key) do nothing;

  get diagnostics v_rows = row_count;  -- 1 = inserito nuovo, 0 = già presente
  if v_rows = 0 then return; end if;

  select reward_pt, nome, emoji into v_reward, v_nome, v_emoji
    from public.badges where key = p_badge_key;
  if not found then return; end if;

  if coalesce(v_reward, 0) > 0 then
    perform public.award_tokens(p_user, v_reward, 'badge', p_badge_key);
  end if;

  perform public.push_to_users(
    array[p_user],
    coalesce(v_emoji, '🏅') || ' Badge sbloccato!',
    coalesce(v_nome, 'Nuovo badge') ||
      (case when coalesce(v_reward,0) > 0 then ' · +' || v_reward || ' PT' else '' end),
    '/(tabs)/profile');
exception when others then
  -- Best-effort: un errore qui (es. push) non deve mai rompere il chiamante.
  null;
end;
$$;

-- Ritorna la lista dei badge di un utente (per la UI dei profili altrui, che
-- non possono leggere user_badges direttamente in join complesse). Definer.
create or replace function public.badges_for_user(p_user uuid)
returns table (badge_key text, unlocked_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select badge_key, unlocked_at from public.user_badges where user_id = p_user
  order by unlocked_at desc;
$$;

-- ============================================================
-- 3. LIVELLI
-- ============================================================

-- Livello (0-4) per un dato numero di scambi confermati. MIRROR di
-- constants/branding.ts (LEVELS): tenere allineate le soglie.
create or replace function public.level_for_scambi(p_scambi int)
returns int
language sql
immutable
as $$
  select case
    when p_scambi >= 40 then 4
    when p_scambi >= 15 then 3
    when p_scambi >= 5  then 2
    when p_scambi >= 1  then 1
    else 0
  end;
$$;

-- Colonna che ricorda l'ultimo livello per cui è stato dato il bonus, così il
-- bonus di livello si paga UNA sola volta per livello.
alter table public.users add column if not exists livello_pagato int not null default 0;

-- Verifica se l'utente ha raggiunto un nuovo livello e, in tal caso, paga il
-- bonus una tantum per OGNI livello nuovo attraversato. Best-effort.
create or replace function public.grant_level_bonus(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scambi int;
  v_livello int;
  v_pagato int;
  v_bonus int;
begin
  select count(*) into v_scambi
    from public.orders
    where stato = 'confermato' and (host_id = p_user or driver_id = p_user);

  v_livello := public.level_for_scambi(v_scambi);
  select livello_pagato into v_pagato from public.users where id = p_user;

  while coalesce(v_pagato, 0) < v_livello loop
    v_pagato := v_pagato + 1;
    v_bonus := case v_pagato
      when 1 then 2 when 2 then 5 when 3 then 10 when 4 then 20 else 0 end;
    perform public.award_tokens(p_user, v_bonus, 'livello', 'livello ' || v_pagato);
    perform public.push_to_users(
      array[p_user], '⬆️ Nuovo livello!', 'Sei salito di livello: +' || v_bonus || ' PT.',
      '/(tabs)/profile');
  end loop;

  update public.users set livello_pagato = v_livello where id = p_user;
exception when others then
  null;
end;
$$;

-- ============================================================
-- 4. KARMA (consegne vs ordini) — colonna calcolata, nessuna scrittura extra
-- ============================================================
-- Positivo = consegni più di quanto ordini (bravo). Negativo = ordini e basta.
create or replace function public.karma_for_user(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.orders where stato = 'confermato' and driver_id = p_user)::int
    -
    (select count(*) from public.orders where stato = 'confermato' and host_id = p_user)::int;
$$;

-- ============================================================
-- 5. ZONE — conquista dei quartieri
-- ============================================================
-- Una "zona" è (citta, cella) dove la cella è lat/lng arrotondati a ~1 km,
-- riusando la logica di arrotondamento di open_requests. Chi ha più punteggio
-- (consegne confermate in quella zona) ne è l'holder.
create table if not exists public.zone_scores (
  user_id   uuid not null references public.users(id) on delete cascade,
  citta     text not null,
  zona      text not null,
  punteggio int  not null default 0,
  primary key (user_id, citta, zona)
);
alter table public.zone_scores enable row level security;
drop policy if exists "zone_scores_public_read" on public.zone_scores;
create policy "zone_scores_public_read" on public.zone_scores
  for select to authenticated using (true);

create table if not exists public.zone_holders (
  citta          text not null,
  zona           text not null,
  holder_user_id uuid references public.users(id) on delete set null,
  punteggio      int  not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (citta, zona)
);
alter table public.zone_holders enable row level security;
drop policy if exists "zone_holders_public_read" on public.zone_holders;
create policy "zone_holders_public_read" on public.zone_holders
  for select to authenticated using (true);

-- Etichetta zona da coordinate (cella ~1 km). Testo stabile per il raggruppamento.
create or replace function public.zone_label(p_lat double precision, p_lng double precision)
returns text
language sql
immutable
as $$
  select case
    when p_lat is null or p_lng is null then 'centro'
    else round(p_lat::numeric, 2)::text || ',' || round(p_lng::numeric, 2)::text
  end;
$$;

-- Accredita un punto zona al driver e aggiorna l'holder se serve. Best-effort.
create or replace function public.bump_zone_score(
  p_user uuid, p_citta text, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zona text;
  v_score int;
  v_holder uuid;
  v_holder_score int;
begin
  if p_user is null or p_citta is null then return; end if;
  v_zona := public.zone_label(p_lat, p_lng);

  insert into public.zone_scores (user_id, citta, zona, punteggio)
  values (p_user, p_citta, v_zona, 1)
  on conflict (user_id, citta, zona)
    do update set punteggio = public.zone_scores.punteggio + 1
  returning punteggio into v_score;

  select holder_user_id, punteggio into v_holder, v_holder_score
    from public.zone_holders where citta = p_citta and zona = v_zona;

  if v_holder is null or v_score > coalesce(v_holder_score, 0) then
    insert into public.zone_holders (citta, zona, holder_user_id, punteggio, updated_at)
    values (p_citta, v_zona, p_user, v_score, now())
    on conflict (citta, zona) do update
      set holder_user_id = excluded.holder_user_id,
          punteggio = excluded.punteggio,
          updated_at = now();

    -- Nuovo re della zona (solo se cambia effettivamente holder).
    if v_holder is distinct from p_user then
      perform public.unlock_badge(p_user, 'zone_king');
      perform public.push_to_users(
        array[p_user], '👑 Hai conquistato una zona!',
        'Sei il nuovo Re del Quartiere a ' || initcap(p_citta) || '.', '/(tabs)/community');
      if v_holder is not null then
        perform public.push_to_users(
          array[v_holder], '👀 Ti hanno soffiato una zona',
          'Qualcuno ti ha superato a ' || initcap(p_citta) || '. Riprenditela!', '/(tabs)/community');
      end if;
    end if;
  end if;
exception when others then
  null;
end;
$$;

-- ============================================================
-- 6. AGGANCIO GAMIFICATION — chiamata da confirm_order dopo il movimento crediti
-- ============================================================
-- Valuta e assegna badge/bonus per host e driver di un ordine appena confermato.
-- SEMPRE best-effort: se qualcosa fallisce, la conferma dello scambio resta valida.
create or replace function public.gamify_on_confirm(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid; v_driver uuid; v_citta text; v_lat double precision; v_lng double precision;
  v_created timestamptz;
  v_driver_deliveries int; v_host_requests int; v_driver_conns int;
  v_hour int;
begin
  select host_id, driver_id, citta, lat, lng, created_at
    into v_host, v_driver, v_citta, v_lat, v_lng, v_created
    from public.orders where id = p_order_id;

  -- ----- Badge & bonus del DRIVER (chi ha consegnato) -----
  if v_driver is not null then
    select count(*) into v_driver_deliveries
      from public.orders where stato = 'confermato' and driver_id = v_driver;

    if v_driver_deliveries >= 1  then perform public.unlock_badge(v_driver, 'first_delivery'); end if;
    if v_driver_deliveries >= 5  then perform public.unlock_badge(v_driver, 'deliveries_5');  end if;
    if v_driver_deliveries >= 10 then perform public.unlock_badge(v_driver, 'deliveries_10'); end if;
    if v_driver_deliveries >= 25 then perform public.unlock_badge(v_driver, 'deliveries_25'); end if;

    -- Amici/connessioni distinte del driver.
    select count(distinct case when host_id = v_driver then driver_id else host_id end)
      into v_driver_conns
      from public.orders
      where stato = 'confermato' and (host_id = v_driver or driver_id = v_driver);
    if coalesce(v_driver_conns, 0) >= 5 then perform public.unlock_badge(v_driver, 'social_butterfly'); end if;

    -- Bonus notturno: consegna dopo le 22 (ora locale Europe/Rome).
    v_hour := extract(hour from (now() at time zone 'Europe/Rome'));
    if v_hour >= 22 or v_hour < 5 then
      perform public.award_tokens(v_driver, 2, 'notturno', 'giro notturno');
      perform public.unlock_badge(v_driver, 'night_owl');
    end if;

    -- Punteggio zona + eventuale conquista quartiere.
    perform public.bump_zone_score(v_driver, v_citta, v_lat, v_lng);

    -- Livelli del driver.
    perform public.grant_level_bonus(v_driver);
  end if;

  -- ----- Badge & livelli dell'HOST (chi ha richiesto) -----
  if v_host is not null then
    select count(*) into v_host_requests
      from public.orders where stato = 'confermato' and host_id = v_host;
    if v_host_requests >= 1 then perform public.unlock_badge(v_host, 'first_request'); end if;
    perform public.grant_level_bonus(v_host);
  end if;
exception when others then
  null;
end;
$$;

-- Riscrive confirm_order aggiungendo la chiamata a gamify_on_confirm al momento
-- della chiusura (quando ENTRAMBI confermano). Il resto è identico a schema.sql.
create or replace function public.confirm_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_host uuid; v_driver uuid; v_stato text; v_crediti int;
  v_host_ok boolean; v_driver_ok boolean;
  v_is_host boolean; v_is_driver boolean;
begin
  select host_id, driver_id, stato, crediti_offerti, host_confermato, driver_confermato
    into v_host, v_driver, v_stato, v_crediti, v_host_ok, v_driver_ok
    from public.orders where id = p_order_id for update;
  if not found then raise exception 'Ordine inesistente'; end if;

  v_is_host   := (auth.uid() = v_host);
  v_is_driver := (auth.uid() = v_driver);
  if not (v_is_host or v_is_driver) then
    raise exception 'Non fai parte di questo ordine';
  end if;
  if v_stato = 'confermato' then raise exception 'Ordine già confermato'; end if;
  if v_stato <> 'consegnato' then raise exception 'L''ordine non è ancora consegnato'; end if;

  if v_is_host   then v_host_ok   := true; end if;
  if v_is_driver then v_driver_ok := true; end if;

  if v_host_ok and v_driver_ok then
    if (select crediti_saldo from public.users where id = v_host) < v_crediti then
      raise exception 'L''host non ha crediti sufficienti per chiudere lo scambio';
    end if;

    update public.orders
      set host_confermato = true, driver_confermato = true,
          stato = 'confermato', updated_at = now()
      where id = p_order_id;

    update public.users set crediti_saldo = crediti_saldo - v_crediti where id = v_host;
    update public.users set crediti_saldo = crediti_saldo + v_crediti where id = v_driver;

    insert into public.credit_transactions (order_id, from_user_id, to_user_id, importo, tipo)
      values (p_order_id, v_host, v_driver, v_crediti, 'consegna');

    -- Gamification (best-effort: non può far fallire la chiusura dello scambio).
    perform public.gamify_on_confirm(p_order_id);
  else
    update public.orders
      set host_confermato = v_host_ok, driver_confermato = v_driver_ok, updated_at = now()
      where id = p_order_id;
  end if;
end; $$;

-- ============================================================
-- 7. INFAME — badge Moretti alla creazione dell'ordine
-- ============================================================
-- Se la lista birre contiene una birra bandita (Moretti), l'host si becca il
-- badge "Infame" (badge di scherno, 0 PT). Controlla i nomi in lista_birre jsonb.
create or replace function public.check_infame()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_banned boolean;
begin
  select exists (
    select 1 from jsonb_array_elements(coalesce(new.lista_birre, '[]'::jsonb)) as b
    where lower(b->>'nome') like '%moretti%'
  ) into v_banned;

  if v_banned then
    perform public.unlock_badge(new.host_id, 'infame');
  end if;
  return new;
exception when others then
  return new;
end; $$;

drop trigger if exists on_order_check_infame on public.orders;
create trigger on_order_check_infame
  after insert on public.orders
  for each row execute function public.check_infame();

-- ============================================================
-- 8. ONBOARDING — persistenza + RPC
-- ============================================================
alter table public.users add column if not exists onboarding_completed boolean not null default false;

-- I NUOVI iscritti partono da false. I beta ESISTENTI, che hanno già usato
-- l'app, restano a false anch'essi di proposito: così rivedono il nuovo
-- onboarding (che spiega la filosofia rinnovata) al primo avvio dopo l'update.

create or replace function public.complete_onboarding()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.users set onboarding_completed = true where id = auth.uid();
end; $$;

-- ============================================================
-- 9. PROFILI RICCHI — interessi + cerco compagnia
-- ============================================================
alter table public.users add column if not exists interessi text[] not null default '{}';
alter table public.users add column if not exists cerco_compagnia boolean not null default false;

-- L'utente può aggiornare anche questi nuovi campi (oltre a nome/bio/ecc.).
grant update (nome, bio, preferenze_birra, foto_url, citta, interessi, cerco_compagnia)
  on public.users to authenticated;

-- public_profiles: aggiungiamo interessi, cerco_compagnia, livello e karma
-- (tutti dati non sensibili) così i profili social sono ricchi.
-- NB: drop + create (non "create or replace"): abbiamo aggiunto colonne IN MEZZO
-- e create-or-replace non consente di rinominare/riordinare le colonne di una
-- view esistente (errore 42P16), esattamente come per open_requests in schema.sql.
drop view if exists public.public_profiles;
create view public.public_profiles as
select
  u.id,
  u.nome,
  u.foto_url,
  u.bio,
  u.preferenze_birra,
  u.interessi,
  u.cerco_compagnia,
  u.citta,
  u.rating_medio,
  date_part('year', age(u.data_nascita))::int as eta,
  (
    select count(*) from public.orders o
    where o.stato = 'confermato' and (o.host_id = u.id or o.driver_id = u.id)
  )::int as scambi_completati,
  public.level_for_scambi((
    select count(*)::int from public.orders o
    where o.stato = 'confermato' and (o.host_id = u.id or o.driver_id = u.id)
  )) as livello,
  public.karma_for_user(u.id) as karma
from public.users u;

grant select on public.public_profiles to authenticated;

-- ============================================================
-- 10. COMPLIMENTI — feedback social leggero dopo uno scambio
-- ============================================================
create table if not exists public.compliments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete cascade,
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id   uuid not null references public.users(id) on delete cascade,
  tipo         text not null,   -- es. 'compagnia' | 'puntuale' | 'birra_fredda' | 'simpatico'
  created_at   timestamptz not null default now(),
  unique (order_id, from_user_id)
);
alter table public.compliments enable row level security;

drop policy if exists "compliments_public_read" on public.compliments;
create policy "compliments_public_read" on public.compliments
  for select to authenticated using (true);

-- Chi ha partecipato all'ordine può complimentarsi con la controparte, una volta.
drop policy if exists "compliments_insert_participant" on public.compliments;
create policy "compliments_insert_participant" on public.compliments
  for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.stato = 'confermato'
        and ((o.host_id = auth.uid() and o.driver_id = to_user_id)
          or (o.driver_id = auth.uid() and o.host_id = to_user_id))
    )
  );

-- Conteggio complimenti ricevuti per tipo (per la UI del profilo).
create or replace function public.compliments_for_user(p_user uuid)
returns table (tipo text, n int)
language sql
security definer
set search_path = public
as $$
  select tipo, count(*)::int as n
  from public.compliments where to_user_id = p_user
  group by tipo order by n desc;
$$;

-- ============================================================
-- 11. EVENTI — "giri di birra" di gruppo (oltre l'1:1 host/driver)
-- ============================================================
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references public.users(id) on delete cascade,
  citta       text,
  titolo      text not null,
  descrizione text,
  quando      timestamptz not null,
  luogo       text,
  lat         double precision,
  lng         double precision,
  posti       int not null default 6,
  stato       text not null default 'aperto',  -- 'aperto' | 'chiuso' | 'annullato'
  created_at  timestamptz not null default now()
);
alter table public.events enable row level security;

-- Eventi aperti e non passati sono pubblici (feed community); i propri sempre.
drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events
  for select to authenticated
  using (stato = 'aperto' or host_id = auth.uid());

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert to authenticated with check (host_id = auth.uid());

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events
  for update to authenticated using (host_id = auth.uid());

create table if not exists public.event_participants (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_participants enable row level security;

drop policy if exists "event_participants_read" on public.event_participants;
create policy "event_participants_read" on public.event_participants
  for select to authenticated using (true);

drop policy if exists "event_participants_join" on public.event_participants;
create policy "event_participants_join" on public.event_participants
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "event_participants_leave" on public.event_participants;
create policy "event_participants_leave" on public.event_participants
  for delete to authenticated using (user_id = auth.uid());

-- Nuovo evento pubblicato → push a tutti gli utenti della città (come le richieste).
create or replace function public.notify_new_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  if new.citta is null then return new; end if;
  select array_agg(u.id) into v_ids
    from public.users u
    where u.citta = new.citta and u.id <> new.host_id;
  perform public.push_to_users(v_ids,
    '🍻 Nuovo giro di birra a ' || initcap(new.citta),
    coalesce(new.titolo, 'Ritrovo') || ' — unisciti!',
    '/event/' || new.id);
  return new;
exception when others then
  return new;
end; $$;

drop trigger if exists on_event_new_push on public.events;
create trigger on_event_new_push
  after insert on public.events
  for each row execute function public.notify_new_event();

-- ============================================================
-- 12. MISSIONI settimanali (leggere) — stato per utente/settimana
-- ============================================================
create table if not exists public.user_missions (
  user_id     uuid not null references public.users(id) on delete cascade,
  mission_key text not null,          -- es. 'deliver_2', 'meet_1'
  settimana   date not null,          -- lunedì della settimana ISO
  completata  boolean not null default false,
  primary key (user_id, mission_key, settimana)
);
alter table public.user_missions enable row level security;
drop policy if exists "user_missions_own" on public.user_missions;
create policy "user_missions_own" on public.user_missions
  for select to authenticated using (user_id = auth.uid());

-- ============================================================
-- 13. LEADERBOARD di città
-- ============================================================
-- Classifica per città: consegne confermate + PeroniToken guadagnati via ledger.
-- Usa solo dati non sensibili (nome, foto). Sicura per lettura pubblica.
create or replace view public.leaderboard_citta as
select
  u.id,
  u.nome,
  u.foto_url,
  u.citta,
  (select count(*) from public.orders o
     where o.stato = 'confermato' and o.driver_id = u.id)::int as consegne,
  public.level_for_scambi((
    select count(*)::int from public.orders o
    where o.stato = 'confermato' and (o.host_id = u.id or o.driver_id = u.id)
  )) as livello
from public.users u
where u.citta is not null;

grant select on public.leaderboard_citta to authenticated;

-- ============================================================
-- 14. REFERRAL
-- ============================================================
alter table public.users add column if not exists referred_by uuid references public.users(id);

-- Applica un referral: l'utente corrente dichiara chi l'ha invitato. Premia
-- entrambi UNA sola volta (solo se referred_by non era già impostato).
create or replace function public.apply_referral(p_inviter uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_current uuid;
begin
  if p_inviter is null or v_me is null or p_inviter = v_me then return; end if;

  select referred_by into v_current from public.users where id = v_me;
  if v_current is not null then return; end if;  -- già usato

  update public.users set referred_by = p_inviter where id = v_me;

  perform public.award_tokens(v_me, 5, 'referral', 'invitato');
  perform public.award_tokens(p_inviter, 5, 'referral', 'ha invitato');
  perform public.unlock_badge(p_inviter, 'ambassador');
exception when others then
  null;
end; $$;

-- ============================================================
-- 15. BACHECA community locale — attività recente per città
-- ============================================================
-- Aggrega eventi già esistenti (badge sbloccati, scambi, nuovi iscritti, eventi)
-- in un unico feed read-only. Nessuna scrittura extra nel hot path.
create or replace view public.community_feed as
  -- Badge sbloccati
  select
    ub.unlocked_at as data,
    'badge'::text  as tipo,
    u.id           as user_id,
    u.nome         as user_nome,
    u.citta        as citta,
    b.nome         as titolo,
    b.emoji        as emoji
  from public.user_badges ub
  join public.users u on u.id = ub.user_id
  join public.badges b on b.key = ub.badge_key
union all
  -- Nuovi iscritti
  select u.created_at, 'nuovo_utente', u.id, u.nome, u.citta,
         'si è unito alla community', '👋'
  from public.users u
union all
  -- Nuovi eventi
  select e.created_at, 'evento', e.host_id, u.nome, e.citta, e.titolo, '🍻'
  from public.events e join public.users u on u.id = e.host_id
  where e.stato = 'aperto';

grant select on public.community_feed to authenticated;

-- ============================================================
-- FINE MIGRATION
-- ============================================================

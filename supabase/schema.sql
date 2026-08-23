-- ============================================================
-- Beer to Beer — Schema database: BASE del progetto
--
-- Questo file crea il database da zero. NON è l'intero schema attuale: sopra
-- di lui vanno le migrazioni in supabase/migrations/, in ordine di data, che
-- aggiungono gamification, eventi, negozi, profilo, sicurezza consegne e
-- ARRICCHISCONO viste e permessi già definiti qui.
--
-- Ordine corretto su un database NUOVO:
--   1) questo file
--   2) supabase/migrations/*.sql, dal più vecchio al più recente
--
-- ⚠️ Su un database GIÀ MIGRATO questo file NON va rieseguito da solo:
-- ricreerebbe `public_profiles` senza livello/karma/interessi/città e
-- riporterebbe i permessi di scrittura alla lista corta, rompendo l'app.
-- (Diceva di essere idempotente: lo era alla Fase 1, non lo è più.)
-- Il blocco qui sotto se ne accorge da solo e ferma tutto prima di toccare
-- qualsiasi cosa. Per rifare un database da zero, esegui prima le migrazioni
-- su un progetto vuoto: lì il controllo non scatta.
-- ============================================================
do $$
begin
  if to_regclass('public.profile_stickers') is not null then
    raise exception using message =
      'STOP: questo database ha già le migrazioni applicate. Rieseguire schema.sql da solo cancellerebbe colonne di public_profiles e permessi su users, rompendo l''app. Applica solo le migrazioni mancanti da supabase/migrations/.';
  end if;
end $$;

-- ---------- USERS ----------
-- Profilo dell'utente. La chiave primaria è anche FK verso auth.users:
-- ogni utente autenticato ha esattamente una riga qui.
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null,
  data_nascita  date not null,
  bio           text,
  foto_url      text,
  preferenze_birra text,
  rating_medio  numeric(2,1) not null default 0,
  crediti_saldo integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------- ORDERS ----------
-- Una richiesta/ordine di consegna birre.
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references public.users(id) on delete cascade,
  driver_id       uuid references public.users(id) on delete set null,
  lista_birre     jsonb not null default '[]'::jsonb,
  indirizzo       text not null,
  lat             double precision,
  lng             double precision,
  stato           text not null default 'richiesto'
                  check (stato in ('richiesto','accettato','in_consegna','consegnato','confermato')),
  vibe_mode       boolean not null default false,
  crediti_offerti integer not null default 0,
  host_confermato   boolean not null default false,
  driver_confermato boolean not null default false,
  fascia          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- CREDIT_TRANSACTIONS ----------
-- Ledger trasparente dei movimenti crediti (ogni movimento è tracciabile).
create table if not exists public.credit_transactions (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete set null,
  from_user_id uuid references public.users(id) on delete set null,
  to_user_id   uuid references public.users(id) on delete set null,
  importo      integer not null,
  tipo         text not null,
  created_at   timestamptz not null default now()
);

-- ---------- REVIEWS ----------
-- Recensioni reciproche post-scambio (alimentano rating_medio).
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete cascade,
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id   uuid not null references public.users(id) on delete cascade,
  voto         integer not null check (voto between 1 and 5),
  commento     text,
  created_at   timestamptz not null default now()
);

-- ---------- REPORTS ----------
-- Segnalazioni utenti/ordini.
create table if not exists public.reports (
  id                 uuid primary key default gen_random_uuid(),
  reported_user_id   uuid not null references public.users(id) on delete cascade,
  reporting_user_id  uuid not null references public.users(id) on delete cascade,
  order_id           uuid references public.orders(id) on delete set null,
  motivo             text not null,
  created_at         timestamptz not null default now()
);

-- ============================================================
-- Migrazioni additive (sicure da rieseguire)
-- `create table if not exists` NON aggiunge colonne a una tabella che esiste già:
-- per i DB creati con una versione precedente dello schema, le nuove colonne vanno
-- qui come `alter ... add column if not exists`. Così rieseguire TUTTO il file
-- porta qualsiasi database allo schema corrente (è ciò che rende il file idempotente).
-- ============================================================
alter table public.users add column if not exists preferenze_birra text;
alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.orders add column if not exists host_confermato   boolean not null default false;
alter table public.orders add column if not exists driver_confermato boolean not null default false;
alter table public.orders add column if not exists fascia text;
-- Città dell'ordine (chiave da lib/cities.ts: torino/milano/roma/bologna).
-- NULL per le righe storiche pre-città: non compaiono nel feed filtrato.
alter table public.orders add column if not exists citta text;
create index if not exists orders_citta_open_idx on public.orders (citta) where stato = 'richiesto';

-- Città preferita dell'utente (sincronizzata dall'app): serve al fan-out delle
-- push "nuova richiesta in città".
alter table public.users add column if not exists citta text;
create index if not exists users_citta_idx on public.users (citta);

-- Sospensione temporanea (moderazione): finché è nel futuro l'utente non può
-- creare nuove richieste (check nel trigger set_order_credits).
alter table public.users add column if not exists sospeso_fino timestamptz;

-- Moderazione richieste: 'oscurato' = nascosta dal feed in attesa di verifica
-- admin; 'rimosso' = decisione definitiva. approvato_admin = true rende
-- l'approvazione "sticky": segnalazioni successive non ri-oscurano (anti
-- report-bombing).
alter table public.orders add column if not exists stato_moderazione text not null default 'ok';
alter table public.orders drop constraint if exists orders_stato_moderazione_chk;
alter table public.orders add  constraint orders_stato_moderazione_chk
  check (stato_moderazione in ('ok','oscurato','rimosso'));
alter table public.orders add column if not exists approvato_admin boolean not null default false;

-- Una sola segnalazione per utente per ordine (anti spam/report-bombing).
create unique index if not exists reports_one_per_user_order
  on public.reports (reporting_user_id, order_id) where order_id is not null;

-- Blocchi utente: chi blocca non vede piu interazioni dirette con l'utente bloccato.
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

-- Chat per ordine, visibile solo ai partecipanti.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  testo text not null check (char_length(trim(testo)) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Token Expo push dell'utente corrente.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Negozietti ("bangladini") mappati dalla community. I nuovi inserimenti
-- nascono 'in_attesa' e compaiono sulla mappa pubblica solo dopo l'approvazione
-- di un admin (che può anche rimuoverli in seguito).
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  citta text not null,
  lat double precision not null,
  lng double precision not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists shops_citta_idx on public.shops (citta);
-- Moderazione negozi + orari stimati segnalati dagli utenti.
alter table public.shops add column if not exists stato text not null default 'in_attesa';
alter table public.shops drop constraint if exists shops_stato_chk;
alter table public.shops add  constraint shops_stato_chk
  check (stato in ('in_attesa','approvato','rimosso'));
alter table public.shops add column if not exists orari text;

-- Chat diretta tra "connessioni" (persone con almeno uno scambio confermato
-- insieme), indipendente dagli ordini. L'anima social/dating dell'app.
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id   uuid not null references public.users(id) on delete cascade,
  testo text not null check (char_length(trim(testo)) between 1 and 1000),
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);
create index if not exists direct_messages_pair_idx
  on public.direct_messages ((least(from_user_id, to_user_id)), (greatest(from_user_id, to_user_id)), created_at);

-- Vincoli di integrità dei crediti (idempotenti): niente offerte negative,
-- niente saldi negativi. Sono la garanzia "dura" contro la creazione di crediti
-- dal nulla o il furto via offerta negativa.
-- Difensivo: azzeriamo eventuali valori negativi PRIMA di aggiungere il vincolo,
-- così `add constraint` non fallisce su dati sporchi (no-op su un DB pulito).
update public.users  set crediti_saldo   = 0 where crediti_saldo   < 0;
update public.orders set crediti_offerti = 0 where crediti_offerti < 0;
alter table public.orders drop constraint if exists orders_crediti_offerti_nonneg;
alter table public.orders add  constraint orders_crediti_offerti_nonneg check (crediti_offerti >= 0);
alter table public.users  drop constraint if exists users_crediti_saldo_nonneg;
alter table public.users  add  constraint users_crediti_saldo_nonneg  check (crediti_saldo >= 0);

-- ============================================================
-- Row Level Security (RLS)
-- Abilitata su tutte le tabelle. Con RLS attiva e NESSUNA policy,
-- l'accesso è negato di default: è il comportamento sicuro che vogliamo.
-- ============================================================
alter table public.users               enable row level security;
alter table public.orders              enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.reviews             enable row level security;
alter table public.reports             enable row level security;
alter table public.blocks              enable row level security;
alter table public.messages            enable row level security;
alter table public.push_tokens         enable row level security;
alter table public.shops               enable row level security;
alter table public.direct_messages     enable row level security;

-- USERS: ognuno può leggere e aggiornare la PROPRIA riga.
-- (La lettura dei profili altrui — es. l'host nel feed — sarà aggiunta
--  in uno step successivo quando collegheremo Feed/Profilo.)
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- La RLS sopra limita la RIGA, non le COLONNE: da sola lascerebbe a un client
-- modificare crediti_saldo o rating_medio della propria riga. Restringiamo quindi
-- le UPDATE dirette alle SOLE colonne di profilo. crediti_saldo / rating_medio si
-- muovono esclusivamente dentro le funzioni SECURITY DEFINER (ledger non falsificabile).
revoke update on public.users from anon, authenticated;
grant  update (nome, bio, preferenze_birra, foto_url, citta) on public.users to authenticated;

-- ORDERS:
--  * lettura diretta della tabella: SOLO i partecipanti (host o driver), in
--    qualsiasi stato — così l'indirizzo esatto resta privato. Il feed pubblico
--    delle richieste aperte passa invece dalla vista `open_requests` (qui sotto),
--    che NON espone l'indirizzo finché l'ordine non è stato accettato.
--  * inserimento: puoi creare solo ordini tuoi (host_id = tu), aperti.
--  * cancellazione: l'host può cancellare un proprio ordine finché è 'richiesto'.
--  * transizioni di stato: NON via UPDATE diretto, ma tramite le funzioni
--    accept_order / advance_order / confirm_order (SECURITY DEFINER) qui sotto.
drop policy if exists "orders_select" on public.orders;
create policy "orders_select"
  on public.orders for select
  using (
    host_id = auth.uid()
    or driver_id = auth.uid()
    -- gli admin aprono qualsiasi ordine (per gestire le segnalazioni dall'app)
    or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin)
  );

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert"
  on public.orders for insert
  with check (
    host_id = auth.uid()
    and driver_id is null
    and stato = 'richiesto'
    and crediti_offerti >= 0
    -- non puoi offrire più crediti di quanti ne hai
    and crediti_offerti <= coalesce((select crediti_saldo from public.users where id = auth.uid()), 0)
  );

drop policy if exists "orders_delete" on public.orders;
create policy "orders_delete"
  on public.orders for delete
  using (host_id = auth.uid() and stato = 'richiesto');

-- CREDIT_TRANSACTIONS: ognuno vede solo i movimenti che lo riguardano.
-- L'inserimento avviene SOLO dentro confirm_order() (SECURITY DEFINER): nessuna
-- policy di insert lato client, così il ledger non è falsificabile.
drop policy if exists "credit_transactions_select" on public.credit_transactions;
create policy "credit_transactions_select"
  on public.credit_transactions for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- REVIEWS: chiunque autenticato puo leggere le recensioni pubbliche.
-- L'inserimento passa dalla funzione submit_review(), che valida ordine e controparte.
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select"
  on public.reviews for select
  using (auth.role() = 'authenticated');

-- REPORTS: l'utente puo creare e leggere le proprie segnalazioni; gli admin vedono tutto.
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  with check (reporting_user_id = auth.uid() and reported_user_id <> auth.uid());

drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin"
  on public.reports for select
  using (
    reporting_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin)
  );

drop policy if exists "reports_delete_admin" on public.reports;
create policy "reports_delete_admin"
  on public.reports for delete
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin));

grant delete on public.reports to authenticated;

-- BLOCKS: ognuno gestisce solo la propria lista blocchi.
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own"
  on public.blocks for select
  using (blocker_user_id = auth.uid());

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own"
  on public.blocks for insert
  with check (blocker_user_id = auth.uid() and blocked_user_id <> auth.uid());

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own"
  on public.blocks for delete
  using (blocker_user_id = auth.uid());

-- Helper SECURITY DEFINER: esiste un blocco in QUALSIASI direzione tra a e b?
-- Deve essere definer: una policy normale vede solo i blocchi del chiamante
-- (blocks_select_own), quindi il "sono stato bloccato dall'altro" passerebbe
-- silenziosamente.
create or replace function public.pair_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_user_id = a and bl.blocked_user_id = b)
       or (bl.blocker_user_id = b and bl.blocked_user_id = a)
  );
$$;

-- MESSAGES: solo host e driver dell'ordine possono leggere/scrivere.
drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.host_id = auth.uid() or o.driver_id = auth.uid())
    )
  );

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.stato in ('accettato','in_consegna','consegnato','confermato')
        and (o.host_id = auth.uid() or o.driver_id = auth.uid())
        -- pair_blocked è SECURITY DEFINER: vede i blocchi di ENTRAMBE le direzioni
        and not public.pair_blocked(o.host_id, coalesce(o.driver_id, o.host_id))
    )
  );

-- Realtime: senza questa publication la chat non riceve i messaggi in tempo reale
-- (subscribeToMessages in data/api.ts usa postgres_changes su public.messages).
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- PUSH TOKENS: ogni utente gestisce i propri token.
drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (user_id = auth.uid());

-- SHOPS: si vedono solo i negozi APPROVATI (più i propri in attesa; gli admin
-- vedono tutto); inserimento a proprio nome; cancellazione creatore o admin.
drop policy if exists "shops_select" on public.shops;
create policy "shops_select"
  on public.shops for select
  using (
    stato = 'approvato'
    or created_by = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin)
  );

drop policy if exists "shops_insert_own" on public.shops;
create policy "shops_insert_own"
  on public.shops for insert
  -- stato forzato a 'in_attesa': nessuno si auto-approva un negozio
  with check (created_by = auth.uid() and stato = 'in_attesa');

drop policy if exists "shops_delete_own_or_admin" on public.shops;
create policy "shops_delete_own_or_admin"
  on public.shops for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin)
  );

-- Due utenti sono "connessi" se hanno almeno uno scambio confermato insieme
-- e nessun blocco in nessuna direzione. Gate della chat diretta.
create or replace function public.pair_allowed(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.stato = 'confermato'
      and ((o.host_id = a and o.driver_id = b) or (o.host_id = b and o.driver_id = a))
  )
  and not public.pair_blocked(a, b);
$$;

-- DIRECT MESSAGES: si legge se partecipanti; si scrive solo verso una connessione.
drop policy if exists "direct_messages_select_participants" on public.direct_messages;
create policy "direct_messages_select_participants"
  on public.direct_messages for select
  using (auth.uid() in (from_user_id, to_user_id));

drop policy if exists "direct_messages_insert_connected" on public.direct_messages;
create policy "direct_messages_insert_connected"
  on public.direct_messages for insert
  with check (from_user_id = auth.uid() and public.pair_allowed(from_user_id, to_user_id));

-- Realtime per la chat diretta (stesso pattern di messages).
do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- Profili pubblici
-- Vista che espone SOLO i campi pubblici di un utente (niente email, niente
-- data di nascita esatta, niente saldo crediti). Serve a mostrare host/driver
-- nel feed e nei dettagli. La vista gira con i privilegi del proprietario e
-- quindi bypassa la RLS della tabella users: è una proiezione pubblica VOLUTA,
-- limitata alle sole colonne sicure elencate qui sotto.
-- ============================================================
create or replace view public.public_profiles as
select
  u.id,
  u.nome,
  u.foto_url,
  u.bio,
  u.preferenze_birra,
  u.rating_medio,
  date_part('year', age(u.data_nascita))::int as eta,
  (
    select count(*) from public.orders o
    where o.stato = 'confermato' and (o.host_id = u.id or o.driver_id = u.id)
  )::int as scambi_completati
from public.users u;

grant select on public.public_profiles to authenticated;

-- ============================================================
-- Feed delle richieste aperte
-- Proiezione delle richieste in stato 'richiesto' SENZA l'indirizzo (né lat/lng):
-- chi sfoglia il feed vede birre, fascia, crediti e host, ma l'indirizzo esatto
-- compare solo dopo l'accettazione (leggendo la tabella orders come partecipante).
-- La vista gira con i privilegi del proprietario (bypassa la RLS di orders): è una
-- proiezione pubblica voluta, limitata alle colonne non sensibili.
-- ============================================================
-- NB: drop + create (non "create or replace"): abbiamo aggiunto lat/lng IN MEZZO
-- alle colonne e create-or-replace non consente di rinominare/riordinare colonne
-- di una view esistente (errore 42P16). Eliminandola prima, la ricreiamo da zero.
drop view if exists public.open_requests;
create view public.open_requests as
select
  id,
  host_id,
  driver_id,
  lista_birre,
  null::text as indirizzo,
  -- coordinate ARROTONDATE (~1 km): mostrano l'area, non il punto esatto,
  -- finché l'ordine non viene accettato (poi i partecipanti leggono orders).
  round(lat::numeric, 2)::double precision as lat,
  round(lng::numeric, 2)::double precision as lng,
  fascia,
  stato,
  vibe_mode,
  crediti_offerti,
  host_confermato,
  driver_confermato,
  created_at,
  citta,
  stato_moderazione
from public.orders
where stato = 'richiesto'
  -- fuori dal feed: richieste oscurate/rimosse dalla moderazione
  and stato_moderazione = 'ok'
  -- fuori dal feed: richieste aperte da più di 12 ore (restano in "I miei ordini";
  -- mirror client: REQUEST_TTL_HOURS in lib/orders.ts)
  and created_at > now() - interval '12 hours';

grant select on public.open_requests to authenticated;

-- ============================================================
-- Ciclo di vita dell'ordine — funzioni SECURITY DEFINER
-- Tutte le transizioni passano da qui: validano CHI può fare COSA in base ad
-- auth.uid() e allo stato corrente. I client non aggiornano `orders` in modo
-- diretto (nessuna policy UPDATE).
-- ============================================================

-- Un driver accetta una richiesta aperta (non sua). Le coordinate del driver
-- (opzionali: GPS negato → null) servono SOLO a calcolare il bonus distanza
-- e non vengono mai salvate. Il totale non supera mai 10 crediti né il saldo
-- corrente dell'host (così confirm_order non può fallire per colpa del bonus).
-- NB: drop esplicito della vecchia firma a 1 argomento — senza, il create
-- sotto genererebbe un OVERLOAD e la chiamata RPC diventerebbe ambigua.
drop function if exists public.accept_order(uuid);

create or replace function public.accept_order(
  p_order_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_d constant numeric := 0.5;  -- crediti per km di distanza driver→consegna (mirror lib/credits.ts)
  v_host uuid; v_stato text; v_lat double precision; v_lng double precision; v_lista jsonb;
  v_weight int; v_bonus int := 0; v_dist numeric; v_saldo int; v_total int;
begin
  select host_id, stato, lat, lng, lista_birre
    into v_host, v_stato, v_lat, v_lng, v_lista
    from public.orders where id = p_order_id for update;
  if not found then raise exception 'Ordine inesistente'; end if;
  if v_stato <> 'richiesto' then raise exception 'Ordine non più disponibile'; end if;
  if v_host = auth.uid() then raise exception 'Non puoi accettare un tuo ordine'; end if;

  v_weight := public.credits_for_weight(v_lista);
  if p_lat is not null and p_lng is not null and v_lat is not null and v_lng is not null then
    v_dist := public.haversine_km(p_lat, p_lng, v_lat, v_lng);
    -- oltre 50 km è un glitch GPS o spoofing: niente bonus.
    if v_dist <= 50 then v_bonus := round(v_dist * v_d)::int; end if;
  end if;

  v_total := least(10, v_weight + v_bonus);
  select crediti_saldo into v_saldo from public.users where id = v_host;
  v_total := greatest(v_weight, least(v_total, coalesce(v_saldo, 0)));

  update public.orders
    set driver_id = auth.uid(), stato = 'accettato',
        crediti_offerti = v_total, updated_at = now()
    where id = p_order_id;
end; $$;

-- Il driver avanza lo stato: accettato → in_consegna → consegnato.
create or replace function public.advance_order(p_order_id uuid, p_new_stato text)
returns void language plpgsql security definer set search_path = public as $$
declare v_driver uuid; v_stato text;
begin
  select driver_id, stato into v_driver, v_stato
    from public.orders where id = p_order_id for update;
  if not found then raise exception 'Ordine inesistente'; end if;
  if v_driver is null or v_driver <> auth.uid() then
    raise exception 'Solo il driver assegnato può aggiornare la consegna';
  end if;
  if not (
    (v_stato = 'accettato'   and p_new_stato = 'in_consegna') or
    (v_stato = 'in_consegna' and p_new_stato = 'consegnato')
  ) then
    raise exception 'Transizione non valida';
  end if;
  update public.orders set stato = p_new_stato, updated_at = now() where id = p_order_id;
end; $$;

-- Host e driver confermano lo scambio dopo la consegna. Quando ENTRAMBI hanno
-- confermato, l'ordine passa a 'confermato' e i crediti si spostano dall'host al
-- driver, scrivendo una riga nel ledger. Il movimento avviene UNA SOLA volta.
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
    -- Copertura: l'host deve avere abbastanza crediti (il vincolo users_crediti_saldo_nonneg
    -- è la rete di sicurezza dura; qui diamo un errore leggibile).
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
  else
    update public.orders
      set host_confermato = v_host_ok, driver_confermato = v_driver_ok, updated_at = now()
      where id = p_order_id;
  end if;
end; $$;

-- Lascia una recensione alla controparte di un ordine confermato.
create or replace function public.submit_review(p_order_id uuid, p_voto int, p_commento text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_host uuid;
  v_driver uuid;
  v_stato text;
  v_to_user uuid;
begin
  if p_voto < 1 or p_voto > 5 then
    raise exception 'Il voto deve essere tra 1 e 5';
  end if;

  select host_id, driver_id, stato into v_host, v_driver, v_stato
    from public.orders where id = p_order_id;
  if not found then raise exception 'Ordine inesistente'; end if;
  if v_stato <> 'confermato' then raise exception 'Puoi recensire solo uno scambio completato'; end if;
  if auth.uid() = v_host then
    v_to_user := v_driver;
  elsif auth.uid() = v_driver then
    v_to_user := v_host;
  else
    raise exception 'Non fai parte di questo ordine';
  end if;
  if v_to_user is null then raise exception 'Controparte non disponibile'; end if;

  insert into public.reviews (order_id, from_user_id, to_user_id, voto, commento)
  values (p_order_id, auth.uid(), v_to_user, p_voto, nullif(trim(p_commento), ''))
  on conflict (order_id, from_user_id) do update
    set voto = excluded.voto,
        commento = excluded.commento,
        created_at = now();

  update public.users u
    set rating_medio = coalesce((
      select round(avg(r.voto)::numeric, 1)
      from public.reviews r
      where r.to_user_id = v_to_user
    ), 0)
    where u.id = v_to_user;
end; $$;

drop index if exists reviews_order_from_unique;
create unique index if not exists reviews_order_from_unique
  on public.reviews(order_id, from_user_id);

-- ============================================================
-- Notifiche push — infrastruttura e trigger
-- Tutte le push passano da push_to_users → edge function send-push (payload
-- {userIds, title, body, url}). Best-effort SEMPRE: nessun flusso applicativo
-- deve fallire perché la push non parte (pg_net assente, edge function giù...).
-- L'URL del progetto non è un segreto e sta hardcoded qui: ALTER DATABASE non è
-- permesso sui progetti Supabase hosted. La edge function va deployata con
-- "Enforce JWT verification" OFF. Hardening futuro: token da Vault + verifica ON.
-- ============================================================
create or replace function public.push_to_users(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url constant text := 'https://kjxahufzseybvxtfsiwu.supabase.co';
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return; end if;
  begin
    perform net.http_post(
      url := v_url || '/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'userIds', to_jsonb(p_user_ids),
        'title', p_title,
        'body', p_body,
        'url', p_url
      )
    );
  exception when others then
    null;
  end;
end; $$;

-- Nuovo messaggio nella chat di un ordine → push all'altro partecipante.
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_receiver uuid;
begin
  select case when o.host_id = new.sender_id then o.driver_id else o.host_id end
    into v_receiver
    from public.orders o
    where o.id = new.order_id;

  if v_receiver is null then return new; end if;
  perform public.push_to_users(
    array[v_receiver], 'Nuovo messaggio', left(new.testo, 120), '/chat/' || new.order_id);
  return new;
end; $$;

drop trigger if exists on_message_send_push on public.messages;
create trigger on_message_send_push
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- Nuovo messaggio diretto (connessioni) → push al destinatario.
create or replace function public.notify_direct_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sender text;
begin
  select nome into v_sender from public.users where id = new.from_user_id;
  perform public.push_to_users(
    array[new.to_user_id],
    coalesce(v_sender, 'Nuovo messaggio'),
    left(new.testo, 120),
    '/chat/direct/' || new.from_user_id);
  return new;
end; $$;

drop trigger if exists on_direct_message_push on public.direct_messages;
create trigger on_direct_message_push
  after insert on public.direct_messages
  for each row execute function public.notify_direct_message();

-- Cambio stato ordine → push alla controparte interessata.
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stato is not distinct from old.stato then return new; end if;

  if new.stato = 'accettato' then
    perform public.push_to_users(array[new.host_id],
      'Richiesta accettata 🍺', 'Un driver ha preso in carico la tua richiesta.',
      '/request/' || new.id);
  elsif new.stato = 'in_consegna' then
    perform public.push_to_users(array[new.host_id],
      'Birre in viaggio', 'Il driver è partito: le tue birre sono in consegna.',
      '/request/' || new.id);
  elsif new.stato = 'consegnato' then
    perform public.push_to_users(array[new.host_id],
      'Consegna effettuata', 'Conferma lo scambio per chiudere e trasferire i crediti.',
      '/request/' || new.id);
  elsif new.stato = 'confermato' and new.driver_id is not null then
    perform public.push_to_users(array[new.host_id, new.driver_id],
      'Scambio completato ✅', 'Crediti trasferiti. Lascia una recensione!',
      '/request/' || new.id);
  end if;

  return new;
end; $$;

drop trigger if exists on_order_status_push on public.orders;
create trigger on_order_status_push
  after update of stato on public.orders
  for each row execute function public.notify_order_status();

-- Nuova richiesta pubblicata → push a tutti gli utenti della stessa città
-- (max 1 push per richiesta by construction: AFTER INSERT scatta una volta).
-- Esclusi: l'host stesso e le coppie con un blocco in qualsiasi direzione.
create or replace function public.notify_new_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  if new.citta is null then return new; end if;

  select array_agg(u.id) into v_ids
    from public.users u
    where u.citta = new.citta
      and u.id <> new.host_id
      and not public.pair_blocked(u.id, new.host_id);

  perform public.push_to_users(v_ids,
    '🍺 Qualcuno ha bisogno di birre!',
    'Nuova richiesta a ' || initcap(new.citta) || ': apri per i dettagli.',
    '/request/' || new.id);
  return new;
end; $$;

drop trigger if exists on_order_new_push on public.orders;
create trigger on_order_new_push
  after insert on public.orders
  for each row execute function public.notify_new_request();

-- ============================================================
-- Moderazione — trigger segnalazioni e RPC admin
-- Segnalazione di una RICHIESTA: oscuramento immediato dal feed + sospensione
-- 48h dell'host (solo creazione nuove richieste) + push agli admin. L'admin poi
-- approva (torna nel feed, sospensione azzerata, approvazione sticky) o rimuove.
-- Segnalazione di un ACCOUNT: nessuna auto-azione, solo push agli admin.
-- ============================================================
create or replace function public.handle_new_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_host uuid;
  v_stato text;
  v_approvato boolean;
  v_admins uuid[];
begin
  if new.order_id is not null then
    select host_id, stato, approvato_admin into v_host, v_stato, v_approvato
      from public.orders where id = new.order_id;
    -- auto-oscuramento solo se: il segnalato è l'host, l'ordine è ancora aperto
    -- e un admin non l'ha già approvato in passato (anti report-bombing).
    if v_host = new.reported_user_id and v_stato = 'richiesto' and not v_approvato then
      update public.orders
        set stato_moderazione = 'oscurato', updated_at = now()
        where id = new.order_id;
      update public.users
        set sospeso_fino = now() + interval '48 hours'
        where id = new.reported_user_id;
    end if;
  end if;

  select array_agg(id) into v_admins from public.users where is_admin;
  perform public.push_to_users(v_admins,
    '⚠️ Nuova segnalazione',
    case when new.order_id is not null
      then 'Una richiesta è stata segnalata e oscurata: verifica dal pannello.'
      else 'Un utente è stato segnalato: verifica dal pannello.' end,
    '/admin/reports');
  return new;
end; $$;

drop trigger if exists on_report_created on public.reports;
create trigger on_report_created
  after insert on public.reports
  for each row execute function public.handle_new_report();

-- Approva ('ok') o rimuove ('rimosso') una richiesta segnalata.
create or replace function public.admin_set_order_moderation(p_order_id uuid, p_stato text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_host uuid;
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin) then
    raise exception 'Operazione riservata agli admin';
  end if;
  if p_stato not in ('ok', 'rimosso') then
    raise exception 'Stato moderazione non valido';
  end if;

  select host_id into v_host from public.orders where id = p_order_id;
  if not found then raise exception 'Ordine inesistente'; end if;

  if p_stato = 'ok' then
    update public.orders
      set stato_moderazione = 'ok', approvato_admin = true, updated_at = now()
      where id = p_order_id;
    -- la segnalazione era infondata: azzera la sospensione dell'host
    update public.users set sospeso_fino = null
      where id = v_host and sospeso_fino > now();
  else
    update public.orders
      set stato_moderazione = 'rimosso', updated_at = now()
      where id = p_order_id;
  end if;
end; $$;

-- Sospende (o riattiva con p_until = null) un utente. Mai contro un admin.
create or replace function public.admin_suspend_user(p_user_id uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin) then
    raise exception 'Operazione riservata agli admin';
  end if;
  if exists (select 1 from public.users where id = p_user_id and is_admin) then
    raise exception 'Non puoi sospendere un account admin';
  end if;
  update public.users set sospeso_fino = p_until where id = p_user_id;
  if not found then raise exception 'Utente inesistente'; end if;
end; $$;

-- Lista utenti per il pannello admin: include l'email (da auth.users, leggibile
-- solo qui grazie a SECURITY DEFINER) e i contatori richieste/consegne.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  nome text,
  email text,
  citta text,
  crediti_saldo integer,
  rating_medio numeric,
  is_admin boolean,
  sospeso_fino timestamptz,
  created_at timestamptz,
  n_richieste bigint,
  n_consegne bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin) then
    raise exception 'Operazione riservata agli admin';
  end if;
  return query
    select u.id, u.nome, au.email::text, u.citta, u.crediti_saldo, u.rating_medio,
           u.is_admin, u.sospeso_fino, u.created_at,
           (select count(*) from public.orders o where o.host_id = u.id) as n_richieste,
           (select count(*) from public.orders o where o.driver_id = u.id and o.stato = 'confermato') as n_consegne
    from public.users u
    join auth.users au on au.id = u.id
    order by u.created_at desc;
end; $$;

-- Elimina definitivamente un account (cascata su tutti i suoi dati). Rifiutato
-- per gli admin (copre anche auto-eliminazione) e per chi ha consegne in corso.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin) then
    raise exception 'Operazione riservata agli admin';
  end if;
  if exists (select 1 from public.users where id = p_user_id and is_admin) then
    raise exception 'Non puoi eliminare un account admin';
  end if;
  if exists (
    select 1 from public.orders
    where (host_id = p_user_id or driver_id = p_user_id)
      and stato in ('accettato', 'in_consegna', 'consegnato')
  ) then
    raise exception 'L''utente ha consegne in corso: chiudile o annullale prima di eliminarlo';
  end if;
  delete from auth.users where id = p_user_id;
  if not found then raise exception 'Utente inesistente'; end if;
end; $$;

-- Nuovo negozio proposto → push agli admin per l'approvazione.
create or replace function public.notify_new_shop()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admins uuid[];
begin
  select array_agg(id) into v_admins from public.users where is_admin;
  perform public.push_to_users(v_admins,
    '🏪 Nuovo negozio da approvare',
    left(new.nome, 60) || ' a ' || initcap(new.citta) || ': approvalo dal pannello.',
    '/admin/shops');
  return new;
end; $$;

drop trigger if exists on_shop_created on public.shops;
create trigger on_shop_created
  after insert on public.shops
  for each row execute function public.notify_new_shop();

-- Approva o rimuove un negozio proposto dalla community.
create or replace function public.admin_set_shop_stato(p_shop_id uuid, p_stato text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin) then
    raise exception 'Operazione riservata agli admin';
  end if;
  if p_stato not in ('approvato', 'rimosso') then
    raise exception 'Stato negozio non valido';
  end if;
  update public.shops set stato = p_stato where id = p_shop_id;
  if not found then raise exception 'Negozio inesistente'; end if;
end; $$;

-- Rettifica manuale dei crediti di un utente (bonus, correzioni, penalità).
-- Ogni movimento finisce nel ledger con tipo 'admin': niente crediti fantasma.
create or replace function public.admin_adjust_credits(p_user_id uuid, p_delta integer, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_saldo integer;
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin) then
    raise exception 'Operazione riservata agli admin';
  end if;
  if p_delta = 0 then return; end if;

  select crediti_saldo into v_saldo from public.users where id = p_user_id;
  if not found then raise exception 'Utente inesistente'; end if;
  if v_saldo + p_delta < 0 then
    raise exception 'Il saldo non può andare sotto zero (attuale: %)', v_saldo;
  end if;

  update public.users set crediti_saldo = crediti_saldo + p_delta where id = p_user_id;

  insert into public.credit_transactions (order_id, from_user_id, to_user_id, importo, tipo)
  values (
    null,
    case when p_delta < 0 then p_user_id else null end,
    case when p_delta > 0 then p_user_id else null end,
    abs(p_delta),
    coalesce(nullif(trim('admin ' || coalesce(p_motivo, '')), 'admin'), 'admin')
  );
end; $$;

-- Fotografia completa della piattaforma per la dashboard admin.
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin) then
    raise exception 'Operazione riservata agli admin';
  end if;

  select jsonb_build_object(
    'utenti_totali', (select count(*) from public.users),
    'utenti_sospesi', (select count(*) from public.users where sospeso_fino > now()),
    'utenti_per_citta', (
      select coalesce(jsonb_object_agg(coalesce(citta, 'sconosciuta'), n), '{}'::jsonb)
      from (select citta, count(*) as n from public.users group by citta) t
    ),
    'crediti_totali', (select coalesce(sum(crediti_saldo), 0) from public.users),
    'crediti_per_citta', (
      select coalesce(jsonb_object_agg(coalesce(citta, 'sconosciuta'), tot), '{}'::jsonb)
      from (select citta, sum(crediti_saldo) as tot from public.users group by citta) t
    ),
    'richieste_aperte', (
      select count(*) from public.orders
      where stato = 'richiesto' and stato_moderazione = 'ok'
        and created_at > now() - interval '12 hours'
    ),
    'ordini_in_corso', (
      select count(*) from public.orders where stato in ('accettato','in_consegna','consegnato')
    ),
    'scambi_completati', (select count(*) from public.orders where stato = 'confermato'),
    'crediti_scambiati_7g', (
      select coalesce(sum(importo), 0) from public.credit_transactions
      where created_at > now() - interval '7 days' and tipo = 'consegna'
    ),
    'richieste_oscurate', (
      select count(*) from public.orders where stato_moderazione = 'oscurato'
    ),
    'negozi_in_attesa', (select count(*) from public.shops where stato = 'in_attesa'),
    'negozi_approvati', (select count(*) from public.shops where stato = 'approvato'),
    'segnalazioni_aperte', (select count(*) from public.reports)
  ) into v_result;

  return v_result;
end; $$;

-- ============================================================
-- Calcolo automatico dei crediti (peso alla creazione + bonus distanza all'accettazione)
-- I crediti NON sono scelti dall'host: il trigger BEFORE INSERT li calcola dal
-- peso (credits_for_weight, cap 10); accept_order aggiunge il bonus in base
-- alla distanza del DRIVER dal punto di consegna. Importo derivato e non
-- falsificabile; massimo assoluto 10 crediti per consegna.
-- NB: queste funzioni sono la "fonte di verità"; lib/credits.ts le rispecchia
-- solo per l'anteprima lato app — vanno tenute allineate.
-- ============================================================

-- Peso (kg, contenitore incluso) per formato di bottiglia/lattina.
create or replace function public.format_weight(p_formato text)
returns numeric language sql immutable as $$
  select case p_formato
    when '33cl'      then 0.55
    when '50cl'      then 0.85
    when '66cl'      then 1.10
    when '75cl'      then 1.30
    when 'lattina33' then 0.40
    when 'lattina50' then 0.58
    else 0.55  -- default prudenziale per formati non riconosciuti
  end;
$$;

-- Peso totale di un ordine a partire da lista_birre [{quantita, formato}, ...].
create or replace function public.order_weight_kg(p_lista jsonb)
returns numeric language sql immutable as $$
  select coalesce(sum(
    (item->>'quantita')::numeric * public.format_weight(item->>'formato')
  ), 0)
  from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) as item;
$$;

-- FONTE DI VERITÀ della parte peso dei crediti (mirror client: lib/credits.ts).
-- BASE=1, W=0.5 crediti/kg, CAP=10. Usata dal trigger di insert e da accept_order.
create or replace function public.credits_for_weight(p_lista jsonb)
returns integer language sql immutable as $$
  select least(10, ceil(1 + public.order_weight_kg(p_lista) * 0.5))::int;
$$;

-- Distanza geodetica in km tra due coordinate (formula dell'emisenoverso).
create or replace function public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns numeric language sql immutable as $$
  select (
    2 * 6371 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lng2 - lng1) / 2), 2)
    ))
  )::numeric;
$$;

-- Trigger: imposta crediti_offerti = credits_for_weight(lista_birre): SOLO peso,
-- cap 10. Il bonus distanza (rispetto al driver reale) viene aggiunto da
-- accept_order al momento dell'accettazione. Ignora qualsiasi valore inviato
-- dal client e blocca la creazione se l'host non ha abbastanza crediti.
create or replace function public.set_order_credits()
returns trigger language plpgsql as $$
declare
  v_saldo integer;
  v_sospeso timestamptz;
begin
  -- Moderazione: un utente sospeso non può creare nuove richieste.
  select sospeso_fino into v_sospeso from public.users where id = new.host_id;
  if v_sospeso > now() then
    raise exception 'Account sospeso fino al % per una segnalazione in verifica',
      to_char(v_sospeso, 'DD/MM HH24:MI');
  end if;

  new.crediti_offerti := public.credits_for_weight(new.lista_birre);

  select crediti_saldo into v_saldo from public.users where id = new.host_id;
  if coalesce(v_saldo, 0) < new.crediti_offerti then
    raise exception 'Crediti insufficienti: questa richiesta ne costa %, ne hai %',
      new.crediti_offerti, coalesce(v_saldo, 0);
  end if;

  return new;
end; $$;

drop trigger if exists on_order_set_credits on public.orders;
create trigger on_order_set_credits
  before insert on public.orders
  for each row execute function public.set_order_credits();

-- ============================================================
-- Trigger: alla creazione di un utente in auth.users, crea automaticamente
-- la riga corrispondente in public.users, leggendo nome e data_nascita
-- dai metadata passati in fase di registrazione (signUp options.data).
-- ============================================================
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
    -- Credito di benvenuto: permette di pubblicare subito qualche richiesta.
    -- (Decisione di prodotto: cambia il valore o metti 0 per partire a secco.)
    20
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Storage: foto profilo (bucket "avatars")
-- Lettura pubblica; ognuno può caricare/aggiornare/cancellare SOLO i file dentro
-- la propria cartella "<uid>/...". Il percorso usato dall'app è "<uid>/avatar-<ts>.jpg".
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

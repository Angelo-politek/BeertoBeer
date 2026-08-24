-- BeerToBeer - le regole che mancavano del tutto (31/08/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- COSA MANCAVA
-- Verificato cercando in tutto lo schema: non esisteva UNA SOLA riga di
-- controllo di frequenza o di quantita'. Si potevano aprire giri all'infinito,
-- chiedere 50 birre, e pubblicare un indirizzo in provincia.
--
-- Il controllo del confine citta' esisteva solo dentro l'app. Un limite che
-- vive solo nell'app non e' un limite: basta una richiesta fatta a mano verso
-- l'API per aggirarlo, e comunque una versione vecchia dell'app installata su
-- un telefono continua a non applicarlo.
--
-- I NUMERI, E PERCHE'
--   3 giri aperti     - chi ne ha tre in sospeso non sta aspettando birre,
--                       sta occupando il feed di tutti.
--   8 richieste/24h   - abbondante per un uso vero, stretto per lo spam.
--   24 birre          - oltre, e' un trasloco. E siccome i crediti sono gia'
--                       al massimo (10) ben prima, oggi le birre oltre la
--                       soglia sarebbero GRATIS: il costo non sale piu'.

-- ============================================================
-- 1. I CONFINI DELLE CITTA', NEL DATABASE
-- ============================================================
-- Fino a ora esistevano solo in lib/cities.ts. Qui diventano dati, cosi' il
-- database puo' applicarli e si aggiungono citta' senza toccare il codice.
create table if not exists public.city_bounds (
  key        text primary key,
  label      text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km  numeric not null check (radius_km > 0)
);

alter table public.city_bounds enable row level security;
drop policy if exists "city_bounds_read" on public.city_bounds;
create policy "city_bounds_read" on public.city_bounds
  for select to authenticated using (true);

-- Torino passa da 15 a 11 km: a 15 km il cerchio si mangiava mezza provincia
-- (Rivoli, Moncalieri, Nichelino). Undici copre il comune e poco altro.
-- NB: un cerchio resta uno strumento grezzo - Collegno e Settimo distano dal
-- centro quanto i quartieri piu' esterni di Torino, e nessun raggio li puo'
-- separare. Il filtro preciso e' il nome del comune restituito dal geocoder
-- (lib/geocoding.ts): questo raggio e' la rete di sicurezza sotto, per il GPS
-- e per il punto scelto a mano sulla mappa.
insert into public.city_bounds (key, label, center_lat, center_lng, radius_km) values
  ('torino',  'Torino',  45.0703, 7.6869, 11),
  ('milano',  'Milano',  45.4642, 9.1900, 13),
  ('roma',    'Roma',    41.9028, 12.4964, 16),
  ('bologna', 'Bologna', 44.4949, 11.3426, 10)
on conflict (key) do update
  set label = excluded.label,
      center_lat = excluded.center_lat,
      center_lng = excluded.center_lng,
      radius_km = excluded.radius_km;

-- Distanza in km fra due punti (formula dell'emisenoverso).
create or replace function public.km_tra(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns numeric language sql immutable as $fn$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  )))::numeric, 3);
$fn$;

-- Il punto sta dentro la citta' dichiarata?
-- Se la citta' non e' fra quelle conosciute si lascia passare: bloccare per
-- una citta' non ancora censita punirebbe l'utente per una nostra mancanza.
create or replace function public.punto_in_citta(
  p_lat double precision, p_lng double precision, p_citta text
) returns boolean language plpgsql stable as $fn$
declare b public.city_bounds%rowtype;
begin
  if p_lat is null or p_lng is null then return false; end if;
  select * into b from public.city_bounds where key = p_citta;
  if not found then return true; end if;
  return public.km_tra(p_lat, p_lng, b.center_lat, b.center_lng) <= b.radius_km;
end $fn$;

-- ============================================================
-- 2. QUANTE BIRRE CI SONO IN UNA LISTA
-- ============================================================
-- jsonb_array_elements solleva un errore se il valore non e' un array. Non
-- basta filtrarlo con una WHERE: la funzione che genera le righe viene
-- valutata PRIMA del filtro, quindi l'errore arriverebbe comunque. Serve un
-- CASE che decida se chiamarla.
create or replace function public.birre_totali(p_lista jsonb)
returns integer language sql immutable as $fn$
  select case when jsonb_typeof(p_lista) = 'array' then coalesce((
    select sum(greatest(1, coalesce(nullif(b->>'quantita', '')::int, 1)))
    from jsonb_array_elements(p_lista) as b
  ), 0) else 0 end::int;
$fn$;

-- ============================================================
-- 3. I LIMITI, APPLICATI ALLA CREAZIONE DEL GIRO
-- ============================================================
-- Si estende il trigger BEFORE INSERT che gia' esisteva per i crediti.
create or replace function public.set_order_credits()
returns trigger language plpgsql as $fn$
declare
  v_disponibile integer;
  v_sospeso     timestamptz;
  v_aperti      integer;
  v_oggi        integer;
  v_birre       integer;
  v_max_aperti  constant integer := 3;
  v_max_giorno  constant integer := 8;
  v_max_birre   constant integer := 24;
begin
  -- Moderazione: un utente sospeso non puo' creare nuove richieste.
  select sospeso_fino into v_sospeso from public.users where id = new.host_id;
  if v_sospeso > now() then
    raise exception 'Account sospeso fino al % per una segnalazione in verifica',
      to_char(v_sospeso, 'DD/MM HH24:MI');
  end if;

  -- Quantita': prima non c'era alcun tetto. I crediti si fermano a 10 molto
  -- prima delle 24 birre, quindi senza questo controllo le birre in piu'
  -- non costerebbero niente.
  v_birre := public.birre_totali(new.lista_birre);
  if v_birre > v_max_birre then
    raise exception 'Massimo % birre per giro (ne hai chieste %). Per una festa servono più giri, oppure un incontro.',
      v_max_birre, v_birre;
  end if;
  if v_birre < 1 then
    raise exception 'Serve almeno una birra.';
  end if;

  -- Posizione dentro la citta' dichiarata. Il controllo c'era solo nell'app.
  if not public.punto_in_citta(new.lat, new.lng, new.citta) then
    raise exception 'Questo indirizzo non risulta dentro la città scelta. Sposta il punto oppure cambia città dal feed.';
  end if;

  -- Giri contemporaneamente aperti.
  select count(*) into v_aperti from public.orders
   where host_id = new.host_id
     and stato in ('richiesto', 'accettato', 'in_consegna', 'arrivato');
  if v_aperti >= v_max_aperti then
    raise exception 'Hai già % giri aperti. Chiudi quelli in corso prima di lanciarne un altro.', v_aperti;
  end if;

  -- Richieste nelle ultime 24 ore, annullate comprese: e' un freno allo spam,
  -- e creare-e-annullare in serie e' esattamente il modo di fare spam.
  select count(*) into v_oggi from public.orders
   where host_id = new.host_id and created_at > now() - interval '24 hours';
  if v_oggi >= v_max_giorno then
    raise exception 'Hai lanciato % giri nelle ultime 24 ore: è questo il limite. Riprova domani.', v_oggi;
  end if;

  new.crediti_offerti := public.credits_for_weight(new.lista_birre);

  v_disponibile := public.available_credits(new.host_id);
  if coalesce(v_disponibile, 0) < new.crediti_offerti then
    raise exception 'BeerCoin insufficienti: questo giro ne costa %, ne hai % disponibili (gli altri sono impegnati in giri ancora aperti)',
      new.crediti_offerti, coalesce(v_disponibile, 0);
  end if;

  return new;
end; $fn$;

-- ============================================================
-- 4. STESSO CONFINE PER GLI INCONTRI
-- ============================================================
-- Un incontro fuori citta' e' lo stesso problema: comparirebbe sulla mappa di
-- Torino un segnaposto che sta a Rivoli.
create or replace function public.check_event_in_citta()
returns trigger language plpgsql as $fn$
begin
  if not public.punto_in_citta(new.lat, new.lng, new.citta) then
    raise exception 'Questo luogo non risulta dentro la città scelta.';
  end if;
  return new;
end $fn$;

drop trigger if exists on_event_check_citta on public.events;
create trigger on_event_check_citta
  before insert or update of lat, lng, citta on public.events
  for each row execute function public.check_event_in_citta();

grant execute on function public.km_tra(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.punto_in_citta(double precision, double precision, text) to authenticated;
grant execute on function public.birre_totali(jsonb) to authenticated;

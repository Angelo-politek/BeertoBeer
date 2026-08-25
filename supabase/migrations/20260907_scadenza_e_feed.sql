-- ============================================================
-- LA SCADENZA DI UN GIRO VIVE IN UN POSTO SOLO
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- ⚠️ Va eseguita PRIMA di pubblicare il bundle che la accompagna: l'app
--    chiede `congelato` a open_requests, e finche' la vista non ce l'ha il
--    feed risponde «colonna inesistente». Vedi sotto.
-- ============================================================
--
-- IL TTL STAVA IN QUATTRO POSTI, NON IN TRE:
--   1. open_requests            interval '12 hours' nella where
--   2. lib/orders.ts            REQUEST_TTL_HOURS = 12
--   3. admin_dashboard_stats    richieste_aperte, con lo stesso interval
--   4. lo Scudo (20260906)      committed_credits e set_order_credits
--
-- Quattro copie dello stesso numero sono quattro occasioni di divergere. Da
-- qui in avanti il numero sta dentro ttl_giro(), e la scadenza e' una colonna
-- vera su ogni riga: `orders.scade_il`.
--
-- PERCHE' UN DEFAULT DI COLONNA E NON UN TRIGGER. set_order_credits e' la
-- funzione piu' densa di guardie dello schema — sospensione, tetto birre,
-- confine citta', tetto aperti, tetto giornaliero, copertura BeerCoin — e in
-- questo progetto ridefinire una funzione per aggiungerci una riga e' gia'
-- costato la perdita di due guardie. Un default e' dichiarativo: non contiene
-- controlli, quindi non puo' perderne.


-- ============================================================
-- 1. IL NUMERO, UNA VOLTA SOLA
-- ============================================================
create or replace function public.ttl_giro() returns interval
language sql immutable as $fn$ select interval '12 hours'; $fn$;

grant execute on function public.ttl_giro() to authenticated;


-- ============================================================
-- 2. LA SCADENZA DIVENTA UN FATTO SULLA RIGA
-- ============================================================
alter table public.orders add column if not exists scade_il timestamptz;

-- Le righe storiche ricevono la scadenza che avevano gia' di fatto.
update public.orders
   set scade_il = created_at + public.ttl_giro()
 where scade_il is null;

alter table public.orders alter column scade_il set default (now() + public.ttl_giro());
alter table public.orders alter column scade_il set not null;

-- Nessuno puo' chiedere una scadenza fuori scala, nemmeno chiamando l'API a
-- mano: un giro che scade fra un anno sarebbe un giro che non scade.
alter table public.orders drop constraint if exists orders_scadenza_chk;
alter table public.orders add constraint orders_scadenza_chk
  check (scade_il > created_at and scade_il <= created_at + interval '24 hours');

create index if not exists orders_scadenza_idx
  on public.orders (scade_il) where stato = 'richiesto';

-- IL PONTE VERSO LE USCITE (l'unita' centrale della V3).
-- La colonna nasce qui, senza chiave esterna, per una ragione precisa: la
-- vista qui sotto va ricostruita comunque, e ricostruirla DUE volte e'
-- l'operazione che in questo repository ha gia' causato un incidente. La
-- chiave esterna arriva insieme alla tabella `uscite`.
alter table public.orders add column if not exists da_uscita_id uuid;


-- ============================================================
-- 3. LA VISTA DEL FEED, RICOSTRUITA UNA VOLTA SOLA
-- ============================================================
-- drop + create e non "create or replace": le colonne nuove stanno IN MEZZO e
-- PostgreSQL non permette di inserirle in una vista esistente (errore 42P16).
-- E' la stessa operazione descritta in 20260826_fix_feed.sql — che racconta
-- cosa succede quando la si sbaglia: feed e mappa vuoti, con un errore che
-- sembra di connessione.
--
-- QUI DENTRO CI VA GIA' TUTTO QUELLO CHE SERVIRA' PIU' AVANTI, apposta:
--   congelato     l'app lo chiede da oggi, per non mostrare pulsanti che il
--                 server rifiuta. Senza questa riga il feed e' spento.
--   scade_il      la scadenza smette di essere una sottrazione fatta a mano
--   da_uscita_id  cosi' l'ondata delle uscite non deve rifare questo drop
drop view if exists public.open_requests;

create view public.open_requests as
select
  id,
  host_id,
  driver_id,
  lista_birre,
  null::text as indirizzo,
  -- coordinate ARROTONDATE (~1 km): mostrano l'area, non il punto esatto,
  -- finche' il giro non viene accettato.
  round(lat::numeric, 2)::double precision as lat,
  round(lng::numeric, 2)::double precision as lng,
  fascia,
  stato,
  vibe_mode,
  crediti_offerti,
  host_confermato,
  driver_confermato,
  created_at,
  updated_at,
  citta,
  stato_moderazione,
  congelato,
  scade_il,
  da_uscita_id
from public.orders
where stato = 'richiesto'
  and stato_moderazione = 'ok'
  -- un giro fermato da una segnalazione di sicurezza esce dal feed subito
  and not congelato
  and scade_il > now()
  -- chi e' bloccato non compare, in nessuna delle due direzioni
  and not public.pair_blocked(host_id, auth.uid());

grant select on public.open_requests to authenticated;


-- ============================================================
-- 4. LA CONTABILITA' LEGGE LA COLONNA INVECE DI RICALCOLARLA
-- ============================================================
-- Rigenerate dal testo dell'ultima definizione (20260906_scudo_beta.sql),
-- non riscritte a memoria: cambia solo il modo di dire «scaduto».
create or replace function public.committed_credits(p_user uuid)
returns integer language sql stable as $$
  -- NB: resta SECURITY INVOKER di proposito. Con i diritti del chiamante la
  -- RLS resta attiva e nessuno puo' usarla per sbirciare il saldo altrui;
  -- dentro accept_order, che e' DEFINER, vede tutto. (20260822_beta_hardening)
  select coalesce(sum(crediti_offerti), 0)::int
  from public.orders
  where host_id = p_user
    and stato not in ('confermato', 'annullato')
    -- un giro mai accettato e scaduto non impegna piu' niente
    and not (stato = 'richiesto' and scade_il <= now());
$$;

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
  select sospeso_fino into v_sospeso from public.users where id = new.host_id;
  if v_sospeso > now() then
    raise exception 'Account sospeso fino al % per una segnalazione in verifica',
      to_char(v_sospeso, 'DD/MM HH24:MI');
  end if;

  v_birre := public.birre_totali(new.lista_birre);
  if v_birre > v_max_birre then
    raise exception 'Massimo % birre per giro (ne hai chieste %). Per una festa servono più giri, oppure un incontro.',
      v_max_birre, v_birre;
  end if;
  if v_birre < 1 then
    raise exception 'Serve almeno una birra.';
  end if;

  if not public.punto_in_citta(new.lat, new.lng, new.citta) then
    raise exception 'Questo indirizzo non risulta dentro la città scelta. Sposta il punto oppure cambia città dal feed.';
  end if;

  -- Giri contemporaneamente aperti. I giri scaduti non contano piu': erano il
  -- modo in cui una persona restava bloccata per sempre. (interval '12 hours')
  select count(*) into v_aperti from public.orders
   where host_id = new.host_id
     and stato in ('richiesto', 'accettato', 'in_consegna', 'arrivato')
     and not (stato = 'richiesto' and scade_il <= now());
  if v_aperti >= v_max_aperti then
    raise exception 'Hai già % giri aperti. Chiudi quelli in corso prima di lanciarne un altro.', v_aperti;
  end if;

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

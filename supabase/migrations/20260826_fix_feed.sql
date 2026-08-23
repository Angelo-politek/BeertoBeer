-- BeerToBeer — ripara il feed e la mappa (26/08/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- PERCHÉ SERVE
-- L'app legge le richieste aperte chiedendo anche updated_at (le serve per
-- capire se un giro è fermo da 24 ore). Quella colonna era stata aggiunta alla
-- vista in una migrazione precedente, ma dopo che quella era già stata
-- eseguita: risultato, il database risponde "colonna inesistente" e feed e
-- mappa restano vuoti mostrando un errore di connessione.
--
-- Questo file contiene SOLO la ricostruzione della vista, così non serve
-- rieseguire nient'altro.
--
-- NB: drop + create e non "create or replace": la colonna sta IN MEZZO alle
-- altre e PostgreSQL non permette di inserire o riordinare le colonne di una
-- vista esistente (errore 42P16).

drop view if exists public.open_requests;

create view public.open_requests as
select
  id,
  host_id,
  driver_id,
  lista_birre,
  null::text as indirizzo,
  -- coordinate ARROTONDATE (~1 km): mostrano l'area, non il punto esatto,
  -- finché l'ordine non viene accettato.
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
  stato_moderazione
from public.orders
where stato = 'richiesto'
  and stato_moderazione = 'ok'
  and created_at > now() - interval '12 hours'
  -- chi è bloccato non compare, in nessuna delle due direzioni
  and not public.pair_blocked(host_id, auth.uid());

grant select on public.open_requests to authenticated;

-- ============================================================
-- UN'USCITA NON PUBBLICA LA VIA DI CASA DI NESSUNO
--
-- Eseguire SUBITO. Sicuro da rieseguire. Non cancella nulla.
-- ============================================================
--
-- COSA E' SUCCESSO. Il foglio «sono fuori» riempiva il campo `zona` con il
-- risultato di `reverseGeocode()`, che restituisce «Via Po 12, Torino» — via e
-- numero civico. Quella riga la legge chiunque in citta' attraverso
-- `uscite_aperte`. Le coordinate erano arrotondate a un chilometro, come
-- previsto; poi accanto ci passava l'indirizzo esatto scritto in chiaro.
--
-- E' esattamente la classe di difetto che la vista redatta esisteva per
-- impedire, arrivata dalla porta di servizio: non dal campo che tutti
-- guardavano, ma da un campo di testo che sembrava innocuo.
--
-- LA LEZIONE, e vale oltre questo caso: la redazione non e' una proprieta' di
-- una colonna, e' una proprieta' del CAMPO PIU' LOQUACE. Arrotondare lat/lng e
-- lasciare accanto un testo libero riempito dal client non protegge niente.
--
-- Tre difese, e servono tutte e tre. Il client e' stato corretto (usa solo il
-- quartiere), ma un client si aggiorna quando la persona riapre l'app: finche'
-- qualcuno gira sul bundle vecchio, continuerebbe a mandare indirizzi. Il
-- database deve rifiutarli da solo.


-- ============================================================
-- 1. BONIFICA — le righe che ci sono gia'
-- ============================================================
-- Prima di tutto il resto: quello che e' gia' pubblicato sparisce adesso.
-- Non si cancellano le uscite (chi e' fuori resta fuori): si cancella la zona.
update public.uscite
   set zona = null
 where zona is not null
   and (
     zona ~ '[0-9]'
     or zona ~* '^\s*(via|viale|v\.le|corso|c\.so|piazza|p\.zza|piazzale|largo|strada|vicolo|lungo|borgo|salita|circonvallazione)\y'
   );


-- ============================================================
-- 2. LA GUARDIA — nessun indirizzo entra piu', da nessun client
-- ============================================================
create or replace function public.zona_ammessa(p_zona text)
returns boolean language sql immutable as $fn$
  select p_zona is null
      or (
        char_length(trim(p_zona)) between 2 and 60
        -- una cifra in una zona e' quasi sempre un numero civico
        and p_zona !~ '[0-9]'
        -- e un toponimo stradale non e' un quartiere
        and p_zona !~* '^\s*(via|viale|v\.le|corso|c\.so|piazza|p\.zza|piazzale|largo|strada|vicolo|lungo|borgo|salita|circonvallazione)\y'
      );
$fn$;

grant execute on function public.zona_ammessa(text) to authenticated;

-- Entra in `regole_uscite`, che e' gia' il posto dove stanno tutte le regole
-- di ingresso. Rigenerata dal testo dell'ultima definizione (20260908_uscite),
-- non riscritta a memoria: cambia solo il blocco della zona.
create or replace function public.regole_uscite()
returns trigger language plpgsql as $fn$
declare
  v_sospeso    timestamptz;
  v_aperte     integer;
  v_max_aperte constant integer := 2;   -- specchio: lib/uscite.ts
  v_max_ore    constant integer := 6;   -- specchio: lib/uscite.ts
begin
  select sospeso_fino into v_sospeso from public.users where id = new.autore_id;
  if v_sospeso > now() then
    raise exception 'Account sospeso fino al %: non puoi dire che sei fuori.',
      to_char(v_sospeso, 'DD/MM HH24:MI');
  end if;

  if not public.punto_in_citta(new.lat, new.lng, new.citta) then
    raise exception 'Questo punto non risulta dentro la città scelta.';
  end if;

  select count(*) into v_aperte from public.uscite
   where autore_id = new.autore_id and stato = 'aperta' and finisce_alle > now();
  if v_aperte >= v_max_aperte then
    raise exception 'Sei già fuori. Chiudi quella che hai aperto prima di dirne un''altra.';
  end if;

  if new.finisce_alle > now() + make_interval(hours => v_max_ore) then
    raise exception 'Un''uscita dura al massimo % ore.', v_max_ore;
  end if;
  if new.finisce_alle <= now() then
    raise exception 'Un''uscita che è già finita non serve a nessuno.';
  end if;

  -- LA ZONA NON E' UN INDIRIZZO.
  -- Non solleva un'eccezione: la azzera. Un client vecchio che manda una via
  -- deve poter pubblicare lo stesso — quello che non deve succedere e' che la
  -- via finisca sotto gli occhi di tutta la citta'.
  if not public.zona_ammessa(new.zona) then
    new.zona := null;
  end if;

  return new;
end $fn$;

-- E anche in aggiornamento: `proroga_uscita` non tocca la zona oggi, ma una
-- funzione futura potrebbe. La guardia sta dove stanno le altre.
create or replace function public.guardie_uscite()
returns trigger language plpgsql as $fn$
declare
  v_sospeso timestamptz;
  v_max_ore constant integer := 6;
begin
  if old.congelata and new.congelata and new.stato is distinct from old.stato then
    if new.stato <> 'chiusa' then
      raise exception 'Questa uscita è ferma: una segnalazione di sicurezza è in verifica.';
    end if;
  end if;

  if new.stato = 'aperta'
     and (old.stato is distinct from new.stato or new.finisce_alle > old.finisce_alle) then
    select sospeso_fino into v_sospeso from public.users where id = new.autore_id;
    if v_sospeso > now() then
      raise exception 'Account sospeso fino al %: non puoi restare fuori.',
        to_char(v_sospeso, 'DD/MM HH24:MI');
    end if;
    if new.finisce_alle > now() + make_interval(hours => v_max_ore) then
      raise exception 'Un''uscita dura al massimo % ore.', v_max_ore;
    end if;
  end if;

  if not public.zona_ammessa(new.zona) then
    new.zona := null;
  end if;

  new.updated_at := now();
  return new;
end $fn$;


-- ============================================================
-- 3. LA VISTA — la terza difesa, per le righe che dovessero passare comunque
-- ============================================================
-- Se un giorno un percorso nuovo scrivesse una zona senza passare dai trigger,
-- qui non uscirebbe lo stesso. Tre difese sono due piu' di quante ne servano,
-- ed e' il punto: questa e' la colonna che ha gia' pubblicato l'indirizzo di
-- una persona.
drop view if exists public.uscite_aperte;

create view public.uscite_aperte as
select
  id,
  autore_id,
  tipo,
  nota,
  -- coordinate ARROTONDATE (~1 km): si mostra l'area, non il punto.
  round(lat::numeric, 2)::double precision as lat,
  round(lng::numeric, 2)::double precision as lng,
  citta,
  -- la zona esce solo se e' davvero una zona
  case when public.zona_ammessa(zona) then zona else null end as zona,
  finisce_alle,
  stato,
  stato_moderazione,
  created_at,
  updated_at
from public.uscite
where stato = 'aperta'
  and stato_moderazione = 'ok'
  and not congelata
  and finisce_alle > now()
  and not public.pair_blocked(autore_id, auth.uid());

grant select on public.uscite_aperte to authenticated;

-- ============================================================
-- LE USCITE — l'unita' centrale della V3
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- Nessuna schermata la usa ancora: sui telefoni, dopo questa migrazione, non
-- cambia niente. E' il pavimento, non la stanza.
-- ============================================================
--
-- LA TESI, IN UNA RIGA. Il giro smette di essere il prodotto e diventa una
-- delle forme in cui una persona si rende disponibile. L'unita' non e'
-- l'ordine: e' l'uscita — una persona, un quartiere, un paio d'ore.
--
-- PERCHE'. Oggi l'app sa mostrare solo domanda insoddisfatta: «qualcuno vuole
-- delle birre». Domanda senza offerta ha l'aspetto di un'app rotta; offerta
-- senza domanda ha l'aspetto di una citta' viva. Con trenta persone a Torino,
-- solo la seconda puo' essere vera il primo giorno. BETA.md lo dice gia' con
-- parole sue: «se le richieste restano aperte senza risposta, il problema non
-- e' tecnico — servono piu' persone attive nella stessa zona».
--
-- PERCHE' SI CHIAMA `uscite` E NON `disponibilita`. Perche' `users.availability`
-- esiste gia' dal 20260713 e significa un'altra cosa («di solito ci sono»):
-- due significati per la stessa parola dentro la stessa base dati e' il modo
-- in cui nasce la confusione che questo progetto ha gia' pagato una volta con
-- il glossario dei giri. E perche' «un'uscita» e' una parola che una persona
-- di vent'anni usa davvero, mentre «disponibilita'» e' una parola da modulo.
--
-- PERCHE' TRE FACCE E NON QUATTRO. Incontri ed eventi ESISTONO GIA' come
-- oggetto proprio (`events.tipo`, dal 20260905) con locandina, partecipanti e
-- chat di gruppo. Rifarli qui sarebbe il doppione che questo repository ha gia'
-- pagato tre volte.
--
-- ⚠️ QUESTO FILE E' UN CONTRATTO. I nomi delle colonne e le firme delle RPC
--    qui sotto sono cio' su cui l'interfaccia verra' costruita. Cambiarli piu'
--    avanti si fa con un overload, non con una riscrittura.


-- ============================================================
-- 1. LA TABELLA
-- ============================================================
-- Modellata deliberatamente su `orders`: stesse coppie di colonne, stessa
-- vista redatta, stesso trigger guardia. Cosi' pair_blocked, punto_in_citta,
-- avvisa, is_admin_user e, lato client, fetchProfiles/withHosts si applicano
-- senza scrivere niente di nuovo.
create table if not exists public.uscite (
  id           uuid primary key default gen_random_uuid(),
  autore_id    uuid not null references public.users(id) on delete cascade,

  -- Le tre facce. E' un check e non un enum: aggiungerne una domani e'
  -- drop+add del vincolo, non una migrazione di tipo.
  --   negozio  «Passo dal negozio»   — e' quella da cui nascono i giri
  --   birra    «Bevo una birra»      — e' quella che assorbe la vibe mode
  --   zona     «Sono in zona»        — il generico che non promette niente
  tipo         text not null check (tipo in ('negozio', 'birra', 'zona')),

  nota         text check (nota is null or char_length(trim(nota)) <= 280),

  -- citta NOT NULL di proposito: orders.citta e' nullable, e le righe storiche
  -- senza citta' sono fuori dal feed per sempre. Non si ripete.
  citta        text not null,
  zona         text,
  lat          double precision not null,
  lng          double precision not null,

  -- NOT NULL, ed e' la correzione strutturale del peggior difetto del modello
  -- dei giri: `orders` non aveva una scadenza, e i tre posti occupati per
  -- sempre, i BeerCoin congelati e il banner fantasma erano tutti conseguenze
  -- di quello. Un'uscita che non finisce non e' un'uscita: e' un profilo.
  finisce_alle timestamptz not null,

  stato        text not null default 'aperta'
               check (stato in ('aperta', 'chiusa', 'scaduta')),
  congelata    boolean not null default false,
  stato_moderazione text not null default 'ok'
               check (stato_moderazione in ('ok', 'oscurato', 'rimosso')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists uscite_feed_idx
  on public.uscite (citta, finisce_alle)
  where stato = 'aperta' and stato_moderazione = 'ok';
create index if not exists uscite_mie_idx
  on public.uscite (autore_id, created_at desc);

-- IL PONTE. La colonna e' nata in 20260907 (mentre la vista del feed si
-- ricostruiva comunque): qui prende la chiave esterna.
do $$ begin
  alter table public.orders
    add constraint orders_da_uscita_fk
    foreign key (da_uscita_id) references public.uscite(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ⚠️ QUESTA COLONNA NON DA' DIRITTI. Dice soltanto da dove e' nato un giro.
--    Se piu' avanti si vorra' che un giro nato da un'uscita sia riservato a
--    quella persona per qualche minuto, quella e' una regola NUOVA e va scritta
--    nel trigger: qui non c'e', e nessuno deve darla per scontata.

alter table public.uscite enable row level security;

-- Le proprie si leggono per intero. Le altrui passano dalla vista redatta.
drop policy if exists "uscite_mie" on public.uscite;
create policy "uscite_mie" on public.uscite
  for select to authenticated
  using (autore_id = auth.uid() or public.is_admin_user());

-- Nessuna policy di insert/update/delete: si passa dalle funzioni, che sanno
-- controllare sospensione, confini, tetti e durata.


-- ============================================================
-- 2. LA VISTA REDATTA — stessa forma di open_requests
-- ============================================================
drop view if exists public.uscite_aperte;

create view public.uscite_aperte as
select
  id,
  autore_id,
  tipo,
  nota,
  -- coordinate ARROTONDATE (~1 km), identico al feed dei giri: si mostra
  -- l'area, non il punto. Chi dice «sono qui» spesso lo dice da casa propria,
  -- ed e' il dato piu' sensibile che questa app abbia mai raccolto.
  round(lat::numeric, 2)::double precision as lat,
  round(lng::numeric, 2)::double precision as lng,
  citta,
  zona,
  finisce_alle,
  stato,
  stato_moderazione,
  created_at,
  updated_at
from public.uscite
where stato = 'aperta'
  and stato_moderazione = 'ok'
  and not congelata
  -- il TTL sta nella where, come per i giri: nessun processo da far girare
  and finisce_alle > now()
  -- chi e' bloccato non compare, in nessuna delle due direzioni
  and not public.pair_blocked(autore_id, auth.uid());

grant select on public.uscite_aperte to authenticated;


-- ============================================================
-- 3. LE DUE GUARDIE
-- ============================================================
-- Stanno nei trigger e non dentro le RPC, ed e' una lezione gia' scritta a
-- mano nell'intestazione di 20260902_segnalazioni.sql: le funzioni che toccano
-- una riga sono tante, un trigger le copre tutte — comprese quelle che non
-- esistono ancora.

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

  -- Stesso confine dei giri e degli incontri. Un punto in provincia farebbe
  -- comparire un segnaposto fuori citta': e' gia' successo due volte.
  if not public.punto_in_citta(new.lat, new.lng, new.citta) then
    raise exception 'Questo punto non risulta dentro la città scelta.';
  end if;

  -- Una persona non e' fuori in cinque modi insieme: sarebbe rumore.
  select count(*) into v_aperte from public.uscite
   where autore_id = new.autore_id and stato = 'aperta' and finisce_alle > now();
  if v_aperte >= v_max_aperte then
    raise exception 'Sei già fuori. Chiudi quella che hai aperto prima di dirne un''altra.';
  end if;

  -- IL TETTO SULLA DURATA. Sei ore sono una serata; piu' a lungo non e' una
  -- serata, e' la tua posizione pubblicata. E' la guardia piu' importante di
  -- questo file, perche' qui una persona dichiara dove sara' e quando.
  if new.finisce_alle > now() + make_interval(hours => v_max_ore) then
    raise exception 'Un''uscita dura al massimo % ore.', v_max_ore;
  end if;
  if new.finisce_alle <= now() then
    raise exception 'Un''uscita che è già finita non serve a nessuno.';
  end if;

  return new;
end $fn$;

drop trigger if exists on_uscite_regole on public.uscite;
create trigger on_uscite_regole before insert on public.uscite
  for each row execute function public.regole_uscite();


create or replace function public.guardie_uscite()
returns trigger language plpgsql as $fn$
declare
  v_sospeso timestamptz;
  v_max_ore constant integer := 6;
begin
  -- (a) UN'USCITA CONGELATA NON CAMBIA STATO.
  --     Chiuderla resta sempre possibile: e' l'uscita di sicurezza, e chi e'
  --     stato segnalato deve poter sparire dalla mappa comunque.
  if old.congelata and new.congelata and new.stato is distinct from old.stato then
    if new.stato <> 'chiusa' then
      raise exception 'Questa uscita è ferma: una segnalazione di sicurezza è in verifica.';
    end if;
  end if;

  -- (b) CHI E' SOSPESO NON LA RIAPRE NE' LA PROROGA.
  --     E' lo stesso buco che guardie_giro ha chiuso per i giri: la
  --     sospensione bloccava solo la CREAZIONE, e chi era escluso restava
  --     comunque in giro.
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

  new.updated_at := now();
  return new;
end $fn$;

drop trigger if exists on_uscite_guardie on public.uscite;
create trigger on_uscite_guardie before update on public.uscite
  for each row execute function public.guardie_uscite();


-- ============================================================
-- 4. LE QUATTRO RPC — e sono quattro apposta
-- ============================================================
-- Non scrivo `uscite_vicine()` ne' `mie_uscite()`: il feed lo da' la vista, i
-- profili li risolve fetchProfiles, la distanza la calcola haversineKm, e le
-- proprie le da' la policy. Ogni RPC che non scrivo e' una firma in meno da
-- rispettare per sempre.

create or replace function public.apri_uscita(
  p_tipo         text,
  p_citta        text,
  p_lat          double precision,
  p_lng          double precision,
  p_finisce_alle timestamptz,
  p_nota         text default null,
  p_zona         text default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid;
begin
  insert into public.uscite (autore_id, tipo, citta, lat, lng, finisce_alle, nota, zona)
  values (auth.uid(), p_tipo, p_citta, p_lat, p_lng, p_finisce_alle,
          nullif(trim(coalesce(p_nota, '')), ''), nullif(trim(coalesce(p_zona, '')), ''))
  returning id into v_id;
  return v_id;
end $fn$;

create or replace function public.chiudi_uscita(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.uscite set stato = 'chiusa'
   where id = p_id and autore_id = auth.uid() and stato = 'aperta';
  if not found then raise exception 'Questa uscita non è tua, o è già chiusa.'; end if;
end $fn$;

create or replace function public.proroga_uscita(p_id uuid, p_finisce_alle timestamptz)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.uscite set finisce_alle = p_finisce_alle
   where id = p_id and autore_id = auth.uid() and stato = 'aperta';
  if not found then raise exception 'Questa uscita non è tua, o è già chiusa.'; end if;
end $fn$;

-- La valvola di sicurezza. Una firma, quattro azioni, una riga in admin_audit.
create or replace function public.admin_uscita(p_id uuid, p_azione text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_autore uuid;
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  if p_azione not in ('oscura', 'ripristina', 'congela', 'chiudi') then
    raise exception 'Azione non prevista';
  end if;
  if char_length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Serve una motivazione: resta scritta.';
  end if;

  select autore_id into v_autore from public.uscite where id = p_id;
  if not found then raise exception 'Uscita inesistente'; end if;

  update public.uscite set
    stato_moderazione = case p_azione when 'oscura' then 'oscurato'
                                      when 'ripristina' then 'ok'
                                      else stato_moderazione end,
    congelata = case p_azione when 'congela' then true
                              when 'ripristina' then false
                              else congelata end,
    stato = case p_azione when 'chiudi' then 'chiusa' else stato end
  where id = p_id;

  insert into public.admin_audit(admin_id, action, target_type, target_id, reason)
  values (auth.uid(), 'uscita_' || p_azione, 'uscita', p_id, trim(p_motivo));

  if p_azione in ('oscura', 'congela', 'chiudi') then
    perform public.avvisa(array[v_autore], 'safety', 'La tua uscita non è più visibile',
      'Motivo: ' || trim(p_motivo) || '. Non hai nessuna limitazione: se pensi sia un errore, scrivilo dal profilo.',
      '/(tabs)/profile', 'uscita-moderata-' || p_id::text);
  end if;
end $fn$;

grant execute on function public.apri_uscita(text, text, double precision, double precision, timestamptz, text, text) to authenticated;
grant execute on function public.chiudi_uscita(uuid) to authenticated;
grant execute on function public.proroga_uscita(uuid, timestamptz) to authenticated;
grant execute on function public.admin_uscita(uuid, text, text) to authenticated;

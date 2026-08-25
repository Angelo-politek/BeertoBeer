-- BeerToBeer - le segnalazioni diventano un fascicolo (02/09/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- SEGNALAZIONI DEL COLLAUDO
--   «Pulsante "non mi sento al sicuro" non invia segnalazione da nessuna parte»
--   «Pulsante "richiesta diversa" non ha senso, non invia la segnalazione»
--   «Gli utenti segnalati devono ricevere un avviso [...] e lasciare la
--    possibilita' di scrivere la propria versione»
--   «Servono piu' tipi di ammonizioni, oltre a un accurato sistema di
--    segnalazioni che permetta di capire chi sono le parti coinvolte e quali
--    sono le dichiarazioni di entrambi, orari, dettagli del giro»
--
-- COSA SUCCEDEVA DAVVERO, ed e' peggio di "non invia".
-- report_order_issue SCRIVEVA, eccome: su order_issues e order_safety_events.
-- Solo che NESSUNA schermata leggeva quelle tabelle. Qualcuno puo' aver
-- premuto "non mi sento al sicuro" mentre era sotto casa di uno sconosciuto,
-- e nessuno lo avrebbe mai saputo.
--
-- E' lo stesso difetto trovato tre volte in questo progetto: un capo del filo
-- collegato e l'altro no. La terza istanza l'ho trovata scrivendo questa
-- migrazione: notification_inbox esiste, l'app la legge e ci conta sopra il
-- pallino rosso della campanella, e NESSUNO ci ha mai scritto niente.
-- Per questo il punto 1 qui sotto non e' un dettaglio: e' la causa comune.

-- ============================================================
-- 1. UN SOLO MODO DI AVVISARE UNA PERSONA
-- ============================================================
-- Prima le notifiche push partivano da push_to_users e la casella in-app
-- restava vuota: due meta' della stessa cosa, scollegate. Da qui in avanti si
-- chiama questa, e arrivano entrambe.
create or replace function public.avvisa(
  p_user_ids  uuid[],
  p_categoria text,
  p_titolo    text,
  p_corpo     text,
  p_url       text default null,
  p_dedupe    text default null
) returns void language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid;
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return; end if;

  foreach v_uid in array p_user_ids loop
    -- La chiave anti-doppione e' per utente: due persone devono poter ricevere
    -- lo stesso avviso.
    insert into public.notification_inbox (user_id, dedupe_key, category, title, body, url)
    values (v_uid, p_dedupe, p_categoria, p_titolo, p_corpo, p_url)
    on conflict (user_id, dedupe_key) do nothing;
  end loop;

  -- La push e' best-effort: se non parte, l'avviso resta comunque in casella.
  perform public.push_to_users(p_user_ids, p_titolo, p_corpo, p_url);
end $fn$;

-- ============================================================
-- 2. IL FASCICOLO
-- ============================================================
-- reports aveva cinque colonne: chi, chi, quale giro, motivo, quando. Niente
-- stato, niente esito, e soprattutto UNA SOLA versione dei fatti. E il
-- pannello admin la CANCELLAVA invece di chiuderla, quindi di una persona
-- segnalata tre volte non restava traccia.
alter table public.reports add column if not exists motivo_codice text;
alter table public.reports add column if not exists gravita text not null default 'media';
alter table public.reports add column if not exists stato text not null default 'aperta';
alter table public.reports add column if not exists dichiarazione_segnalante text;
alter table public.reports add column if not exists dichiarazione_segnalato text;
alter table public.reports add column if not exists risposto_il timestamptz;
alter table public.reports add column if not exists note_admin text;
alter table public.reports add column if not exists chiusa_da uuid references public.users(id);
alter table public.reports add column if not exists chiusa_il timestamptz;
-- Fotografia del giro al momento della segnalazione: se il giro viene
-- cancellato, il fascicolo deve restare leggibile lo stesso.
alter table public.reports add column if not exists contesto jsonb;

alter table public.reports drop constraint if exists reports_gravita_chk;
alter table public.reports add  constraint reports_gravita_chk
  check (gravita in ('bassa', 'media', 'alta'));

alter table public.reports drop constraint if exists reports_stato_chk;
alter table public.reports add  constraint reports_stato_chk
  check (stato in ('aperta', 'in_esame', 'chiusa'));

create index if not exists reports_da_gestire_idx
  on public.reports (stato, gravita, created_at desc);

-- ============================================================
-- 3. I PROVVEDIMENTI
-- ============================================================
-- Prima esisteva una pena sola: 48 ore, scritte a mano nella schermata admin.
-- Il backend accettava gia' qualsiasi scadenza: la rigidita' era tutta
-- nell'interfaccia. Qui i provvedimenti diventano una storia consultabile,
-- perche' la terza segnalazione su una persona deve pesare piu' della prima.
create table if not exists public.provvedimenti (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  report_id  uuid references public.reports(id) on delete set null,
  tipo       text not null check (tipo in ('avvertimento', 'sospensione', 'esclusione')),
  fino_a     timestamptz,
  motivo     text not null,
  admin_id   uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.provvedimenti enable row level security;

drop policy if exists "provvedimenti_miei_o_admin" on public.provvedimenti;
create policy "provvedimenti_miei_o_admin" on public.provvedimenti
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin_user());

create index if not exists provvedimenti_utente_idx
  on public.provvedimenti (user_id, created_at desc);

-- ============================================================
-- 4. IL GIRO SI PUO' CONGELARE
-- ============================================================
-- "Non mi sento al sicuro" deve fermare il giro, non solo segnalarlo.
alter table public.orders add column if not exists congelato boolean not null default false;

-- LA GUARDIA STA IN UN POSTO SOLO.
-- Le funzioni che fanno avanzare un giro sono otto (accept_order,
-- advance_order, arrive_order, verify_delivery_code, confirm_exchange_nearby,
-- confirm_order, release_accepted_order, cancel_active_order). Metterci il
-- controllo dentro una per una significa dimenticarne una oggi, e
-- dimenticarsene un'altra quando se ne aggiunge la nona: e' esattamente il
-- modo in cui in questo progetto la chat e' rimasta bloccata sullo stato
-- 'arrivato'. Un trigger le copre tutte, comprese quelle che non esistono
-- ancora.
create or replace function public.guardie_giro()
returns trigger language plpgsql as $fn$
declare v_sospeso timestamptz;
begin
  -- (a) UN GIRO CONGELATO NON AVANZA.
  if old.congelato and new.congelato and new.stato is distinct from old.stato then
    -- Annullare resta sempre possibile: e' l'uscita di sicurezza, e a volte e'
    -- proprio quello che l'amministratore deve poter fare.
    if new.stato <> 'annullato' then
      raise exception 'Questo giro e fermo: una segnalazione di sicurezza e in verifica. Un amministratore risponde al piu presto.';
    end if;
  end if;

  -- (b) CHI E' SOSPESO NON PUO' NEMMENO ACCETTARE.
  -- La sospensione bloccava solo la CREAZIONE di giri (dentro
  -- set_order_credits). Chi era sospeso o escluso poteva comunque accettare i
  -- giri degli altri e presentarsi a casa loro: il provvedimento non serviva
  -- a niente proprio contro chi e' pericoloso.
  if new.driver_id is not null and new.driver_id is distinct from old.driver_id then
    select sospeso_fino into v_sospeso from public.users where id = new.driver_id;
    if v_sospeso > now() then
      raise exception 'Account sospeso fino al %: non puoi accettare giri.',
        to_char(v_sospeso, 'DD/MM HH24:MI');
    end if;
  end if;

  return new;
end $fn$;

drop trigger if exists on_order_congelato on public.orders;
drop trigger if exists on_order_guardie on public.orders;
create trigger on_order_guardie
  before update on public.orders
  for each row execute function public.guardie_giro();

-- ============================================================
-- 5. SEGNALARE UN PROBLEMA DURANTE UN GIRO
-- ============================================================
-- Sostituisce report_order_issue. Continua a scrivere su order_issues e
-- order_safety_events (la cronologia serve al fascicolo), ma ora fa anche le
-- due cose che mancavano: apre una segnalazione VERA e avvisa qualcuno.
create or replace function public.segnala_problema_giro(
  p_order_id uuid,
  p_tipo     text,
  p_dettagli text default ''
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  v          public.orders%rowtype;
  v_altro    uuid;
  v_gravita  text;
  v_report   uuid;
  v_admin    uuid[];
  v_nome     text;
begin
  if p_tipo not in ('cannot_start', 'delay', 'person_absent', 'request_mismatch', 'unsafe') then
    raise exception 'Motivo non valido';
  end if;

  select * into v from public.orders where id = p_order_id for update;
  if not found then raise exception 'Giro inesistente'; end if;
  if auth.uid() not in (v.host_id, coalesce(v.driver_id, v.host_id)) then
    raise exception 'Azione non consentita';
  end if;

  -- Cronologia, come prima.
  insert into public.order_issues (order_id, actor_id, issue_type, details)
  values (p_order_id, auth.uid(), p_tipo, nullif(trim(p_dettagli), ''));
  insert into public.order_safety_events (order_id, actor_id, event_type, metadata)
  values (p_order_id, auth.uid(), 'reported', jsonb_build_object('type', p_tipo));

  -- «Sono in ritardo» e «non riesco a partire» sono comunicazioni fra le due
  -- persone, non accuse: si fermano qui, e avvisano soltanto la controparte.
  v_altro := case when auth.uid() = v.host_id then v.driver_id else v.host_id end;

  if p_tipo in ('delay', 'cannot_start') then
    if v_altro is not null then
      perform public.avvisa(
        array[v_altro], 'order',
        case when p_tipo = 'delay' then 'Ci sara da aspettare' else 'Problema a partire' end,
        coalesce(nullif(trim(p_dettagli), ''), 'La persona con cui hai il giro ha segnalato un imprevisto.'),
        '/request/' || p_order_id::text
      );
    end if;
    return null;
  end if;

  -- Le altre tre aprono un fascicolo, e un fascicolo ha bisogno di due parti.
  -- Senza controparte (giro ancora senza chi porta) non c'e' nessuno da
  -- segnalare: senza questa guardia si finirebbe per segnalare se stessi.
  if v_altro is null then
    raise exception 'Su questo giro non c e ancora nessun altro da segnalare.';
  end if;

  v_gravita := case when p_tipo = 'unsafe' then 'alta' else 'media' end;

  insert into public.reports (
    reported_user_id, reporting_user_id, order_id, motivo,
    motivo_codice, gravita, dichiarazione_segnalante, contesto
  ) values (
    v_altro, auth.uid(), p_order_id,
    p_tipo || coalesce(': ' || nullif(trim(p_dettagli), ''), ''),
    p_tipo, v_gravita, nullif(trim(p_dettagli), ''),
    -- Fotografia del giro adesso: se poi viene cancellato, il fascicolo resta
    -- comunque leggibile.
    jsonb_build_object(
      'stato', v.stato,
      'citta', v.citta,
      'creato_il', v.created_at,
      'aggiornato_il', v.updated_at,
      'crediti', v.crediti_offerti,
      'birre', v.lista_birre,
      'vibe_mode', v.vibe_mode
    )
  ) returning id into v_report;

  -- «Non mi sento al sicuro» ferma il giro. Chi ha paura non deve continuare a
  -- vedere l'indirizzo dell'altro ne' sentirsi in dovere di completare.
  if p_tipo = 'unsafe' then
    update public.orders set congelato = true, updated_at = now() where id = p_order_id;
  end if;

  -- Avviso agli amministratori. Le segnalazioni gravi non devono aspettare che
  -- qualcuno apra l'app per caso.
  select array_agg(id) into v_admin from public.users where is_admin;
  select nome into v_nome from public.users where id = auth.uid();
  if v_admin is not null then
    perform public.avvisa(
      v_admin, 'safety',
      case when p_tipo = 'unsafe' then 'SEGNALAZIONE GRAVE' else 'Nuova segnalazione' end,
      coalesce(v_nome, 'Una persona') || ': ' ||
        case p_tipo
          when 'unsafe' then 'non si sente al sicuro. Giro fermato.'
          when 'person_absent' then 'non trova la persona.'
          else 'contesta il contenuto del giro.'
        end,
      '/admin/reports'
    );
  end if;

  -- Chi e' segnalato ha diritto di saperlo e di rispondere. Di proposito NON
  -- gli si dice chi lo ha segnalato: rivelarlo invita alla ritorsione, ed e'
  -- il modo piu' rapido per far smettere la gente di segnalare.
  if v_altro is not null then
    perform public.avvisa(
      array[v_altro], 'safety',
      'Hai ricevuto una segnalazione',
      'Qualcuno ha segnalato un problema su un giro. Se pensi si tratti di un errore, puoi scrivere la tua versione: la leggeranno gli amministratori.',
      '/segnalazione/' || v_report::text
    );
  end if;

  return v_report;
end $fn$;

-- ============================================================
-- 6. SEGNALARE UNA PERSONA (fuori da un giro)
-- ============================================================
create or replace function public.segnala_utente(
  p_user_id  uuid,
  p_motivo   text,
  p_dettagli text default '',
  p_order_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_report uuid; v_admin uuid[];
begin
  if p_user_id = auth.uid() then raise exception 'Non puoi segnalare te stesso'; end if;
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Persona inesistente';
  end if;

  insert into public.reports (
    reported_user_id, reporting_user_id, order_id, motivo,
    motivo_codice, gravita, dichiarazione_segnalante
  ) values (
    p_user_id, auth.uid(), p_order_id,
    p_motivo || coalesce(': ' || nullif(trim(p_dettagli), ''), ''),
    p_motivo, 'media', nullif(trim(p_dettagli), '')
  ) returning id into v_report;

  select array_agg(id) into v_admin from public.users where is_admin;
  if v_admin is not null then
    perform public.avvisa(v_admin, 'safety', 'Nuova segnalazione',
      'Una persona ne ha segnalata un altra.', '/admin/reports');
  end if;

  perform public.avvisa(array[p_user_id], 'safety', 'Hai ricevuto una segnalazione',
    'Se pensi si tratti di un errore, puoi scrivere la tua versione: la leggeranno gli amministratori.',
    '/segnalazione/' || v_report::text);

  return v_report;
end $fn$;

-- ============================================================
-- 7. LA VERSIONE DI CHI E' STATO SEGNALATO
-- ============================================================
-- Restituisce solo cio' che la persona segnalata puo' vedere: il motivo, la
-- gravita, la data. MAI chi l'ha segnalata.
create or replace function public.mie_segnalazioni()
returns table (
  id uuid, motivo_codice text, gravita text, stato text,
  creata_il timestamptz, gia_risposto boolean, mia_dichiarazione text
) language sql security definer set search_path = public stable as $fn$
  select r.id, r.motivo_codice, r.gravita, r.stato,
         r.created_at, r.risposto_il is not null, r.dichiarazione_segnalato
  from public.reports r
  where r.reported_user_id = auth.uid()
  order by r.created_at desc;
$fn$;

create or replace function public.rispondi_a_segnalazione(
  p_report_id uuid,
  p_testo     text
) returns void language plpgsql security definer set search_path = public as $fn$
declare v_admin uuid[];
begin
  if char_length(trim(p_testo)) < 5 then
    raise exception 'Scrivi qualcosa in piu: agli amministratori serve capire cosa e successo.';
  end if;

  update public.reports
     set dichiarazione_segnalato = left(trim(p_testo), 4000),
         risposto_il = now(),
         stato = case when stato = 'chiusa' then stato else 'in_esame' end
   where id = p_report_id
     and reported_user_id = auth.uid();

  if not found then raise exception 'Segnalazione non trovata'; end if;

  select array_agg(id) into v_admin from public.users where is_admin;
  if v_admin is not null then
    perform public.avvisa(v_admin, 'safety', 'Risposta a una segnalazione',
      'La persona segnalata ha scritto la sua versione.', '/admin/reports');
  end if;
end $fn$;

-- ============================================================
-- 8. LA SCALA DEI PROVVEDIMENTI
-- ============================================================
-- avvertimento (nessuna limitazione, ma resta scritto)
--   -> sospensione a giorni  -> esclusione
-- Ogni provvedimento e' motivato, notificato e conservato.
create or replace function public.admin_provvedimento(
  p_report_id uuid,
  p_user_id   uuid,
  p_tipo      text,
  p_giorni    int,
  p_motivo    text
) returns void language plpgsql security definer set search_path = public as $fn$
declare v_fino timestamptz; v_testo text;
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  if p_tipo not in ('avvertimento', 'sospensione', 'esclusione') then
    raise exception 'Provvedimento non valido';
  end if;
  if char_length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Serve una motivazione: la legge anche la persona che la riceve.';
  end if;

  if p_tipo = 'sospensione' then
    v_fino := now() + make_interval(days => greatest(1, coalesce(p_giorni, 1)));
  elsif p_tipo = 'esclusione' then
    -- Esclusione = sospensione senza fine. Non si cancella l'account: i giri
    -- passati e le segnalazioni devono restare consultabili.
    v_fino := now() + interval '100 years';
  end if;

  if v_fino is not null then
    update public.users set sospeso_fino = v_fino where id = p_user_id;
  end if;

  insert into public.provvedimenti (user_id, report_id, tipo, fino_a, motivo, admin_id)
  values (p_user_id, p_report_id, p_tipo, v_fino, trim(p_motivo), auth.uid());

  insert into public.admin_audit (admin_id, action, target_type, target_id, reason)
  values (auth.uid(), 'provvedimento_' || p_tipo, 'user', p_user_id, trim(p_motivo));

  v_testo := case p_tipo
    when 'avvertimento' then 'Hai ricevuto un avvertimento. Nessuna limitazione, ma resta scritto.'
    when 'sospensione'  then 'Il tuo account e sospeso fino al ' || to_char(v_fino, 'DD/MM alle HH24:MI') || '.'
    else 'Il tuo account e stato escluso da Beer to Beer.'
  end;
  perform public.avvisa(array[p_user_id], 'safety', 'Provvedimento',
    v_testo || ' Motivo: ' || trim(p_motivo), '/settings');

  if p_report_id is not null then
    update public.reports
       set stato = 'chiusa', chiusa_da = auth.uid(), chiusa_il = now()
     where id = p_report_id;
  end if;
end $fn$;

-- Chiudere senza punire: serve tanto quanto punire, e va lasciata traccia.
create or replace function public.admin_chiudi_segnalazione(
  p_report_id uuid,
  p_note      text
) returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  update public.reports
     set stato = 'chiusa', note_admin = trim(p_note),
         chiusa_da = auth.uid(), chiusa_il = now()
   where id = p_report_id;
  insert into public.admin_audit (admin_id, action, target_type, target_id, reason)
  values (auth.uid(), 'chiudi_segnalazione', 'report', p_report_id, trim(p_note));
end $fn$;

-- Sbloccare un giro congelato dopo aver verificato.
create or replace function public.admin_scongela_giro(
  p_order_id uuid,
  p_motivo   text
) returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  update public.orders set congelato = false, updated_at = now() where id = p_order_id;
  insert into public.admin_audit (admin_id, action, target_type, target_id, reason)
  values (auth.uid(), 'scongela_giro', 'order', p_order_id, trim(p_motivo));
end $fn$;

-- ============================================================
-- 9. PERMESSI
-- ============================================================
-- Le segnalazioni non si cancellano piu': si chiudono. Di una persona
-- segnalata tre volte deve restare traccia di tutte e tre.
drop policy if exists "reports_delete_admin" on public.reports;
revoke delete on public.reports from authenticated;

-- avvisa e push_to_users NON si concedono a nessuno: le chiamano solo altre
-- funzioni SECURITY DEFINER, dall'interno del database.
--
-- ATTENZIONE, e' una falla che c'era gia': in Postgres una funzione nuova e'
-- eseguibile da PUBLIC per impostazione predefinita. push_to_users non e' mai
-- stata revocata, quindi finora QUALSIASI utente registrato poteva chiamarla e
-- mandare una notifica push a chiunque, con il testo che voleva. Le revoche
-- qui sotto chiudono sia la mia funzione nuova sia quella vecchia.
revoke all on function public.avvisa(uuid[], text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.push_to_users(uuid[], text, text, text) from public, anon, authenticated;
grant execute on function public.segnala_problema_giro(uuid, text, text) to authenticated;
grant execute on function public.segnala_utente(uuid, text, text, uuid) to authenticated;
grant execute on function public.mie_segnalazioni() to authenticated;
grant execute on function public.rispondi_a_segnalazione(uuid, text) to authenticated;
grant execute on function public.admin_provvedimento(uuid, uuid, text, int, text) to authenticated;
grant execute on function public.admin_chiudi_segnalazione(uuid, text) to authenticated;
grant execute on function public.admin_scongela_giro(uuid, text) to authenticated;

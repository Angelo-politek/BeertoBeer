-- ============================================================
-- SCUDO BETA — le sei correzioni che devono esserci prima di mandare
-- l'app a 20-30 persone.
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- Perche' tutte insieme e perche' PRIMA del bundle: il database e' l'unico
-- canale che raggiunge anche i telefoni che non hanno ancora ricevuto l'OTA.
-- Queste sei aiutano anche chi resta indietro.
-- ============================================================


-- ============================================================
-- A1. UNA SOLA MODERAZIONE, E NESSUNA PUNIZIONE AUTOMATICA
-- ============================================================
-- C'erano due sistemi sovrapposti che non si parlavano:
--
--   handle_new_report  (schema.sql, il vecchio)  -> oscurava il giro,
--       SOSPENDEVA L'HOST PER 48 ORE, e mandava una push agli admin.
--   segnala_problema_giro / segnala_utente  (20260902, il nuovo)
--       -> apre un fascicolo, congela il giro se il motivo e' «non mi sento
--          al sicuro», e avvisa gli admin con avvisa().
--
-- Conseguenze in beta: due notifiche per ogni segnalazione, e soprattutto una
-- persona in buona fede bloccata due giorni perche' qualcuno ha esagerato.
-- E' l'unico difetto il cui danno cresce con il numero di tester.
--
-- COSA RESTA E COSA VA VIA. Il contenuto continua a sparire da solo: un giro
-- segnalato esce subito dal feed, e questo e' giusto perche' e' reversibile.
-- La SOSPENSIONE DELLA PERSONA diventa un atto umano: per quello ci sono i
-- provvedimenti (20260902_segnalazioni.sql), che chiedono una motivazione e
-- restano scritti.
-- Via anche la push: la mandano gia' le RPC nuove tramite avvisa(), sul canale
-- prioritario. Questa arrivava seconda e diceva la stessa cosa peggio.
create or replace function public.handle_new_report()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_host      uuid;
  v_stato     text;
  v_approvato boolean;
begin
  if new.order_id is not null then
    select host_id, stato, approvato_admin into v_host, v_stato, v_approvato
      from public.orders where id = new.order_id;

    -- Auto-oscuramento del CONTENUTO: solo se il segnalato e' chi ha lanciato
    -- il giro, il giro e' ancora aperto, e un admin non l'ha gia' approvato in
    -- passato (che e' la difesa contro il report-bombing).
    if v_host = new.reported_user_id and v_stato = 'richiesto' and not v_approvato then
      update public.orders
         set stato_moderazione = 'oscurato', updated_at = now()
       where id = new.order_id;
    end if;
    -- NESSUN update su users.sospeso_fino. Deliberatamente.
  end if;

  -- NESSUNA push. La manda avvisa() dentro segnala_problema_giro/segnala_utente.
  return new;
end $fn$;


-- ============================================================
-- A2. DUE AMICI SI POSSONO SCRIVERE
-- ============================================================
-- 20260905_persone.sql ha introdotto le amicizie e ha scritto sono_amici(),
-- ma non ha allargato pair_allowed() — che e' il gate della chat diretta e
-- chiede un giro confermato in comune. Risultato: app/amici.tsx mostra il
-- pulsante «Scrivi» su ogni amico, la RLS rifiuta l'insert, e la chat
-- restituisce l'errore grezzo del server.
--
-- E' lo stesso difetto che 20260830 chiama «un elenco cambiato da una parte e
-- non dall'altra». Ed e' anche il motivo per cui sono_amici() esisteva senza
-- che nessuno la chiamasse.
create or replace function public.pair_allowed(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (
    exists (
      select 1 from public.orders o
      where o.stato = 'confermato'
        and ((o.host_id = a and o.driver_id = b) or (o.host_id = b and o.driver_id = a))
    )
    or public.sono_amici(a, b)
  )
  and not public.pair_blocked(a, b);
$$;


-- ============================================================
-- A3. UN GIRO SCADUTO SMETTE DI COSTARE
-- ============================================================
-- Il feed nasconde i giri dopo 12 ore (open_requests), ma nel database
-- restano 'richiesto' per sempre. Quindi continuano a occupare uno dei tre
-- posti disponibili E a tenere impegnati i BeerCoin.
--
-- Effetto vissuto da un tester: tre giri lanciati e dimenticati, e da quel
-- momento l'app dice «hai gia' 3 giri aperti» e «BeerCoin insufficienti» per
-- sempre, senza che niente spieghi perche' ne' come uscirne.
--
-- Non serve uno spazzino (e sul piano gratuito non c'e' pg_cron): basta
-- smettere di contarli. Cosi' la correzione vale subito per tutti, anche per
-- chi non ha ancora ricevuto il bundle nuovo.
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
    and not (stato = 'richiesto' and created_at <= now() - interval '12 hours');
$$;

-- Stessa finestra sul tetto dei tre giri aperti. Il resto della funzione e'
-- ricopiato dall'ultima definizione (20260831_regole_e_limiti.sql): non si
-- riscrive a memoria una funzione che contiene sei guardie.
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

  -- Giri contemporaneamente aperti. I 'richiesto' scaduti non contano piu':
  -- erano il modo in cui una persona restava bloccata per sempre.
  select count(*) into v_aperti from public.orders
   where host_id = new.host_id
     and stato in ('richiesto', 'accettato', 'in_consegna', 'arrivato')
     and not (stato = 'richiesto' and created_at <= now() - interval '12 hours');
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


-- ============================================================
-- A4. IL CODICE DI CONSEGNA SCADE DAVVERO
-- ============================================================
-- order_delivery_codes.expires_at esiste dal 20260712 e non e' mai stato
-- controllato da nessuna versione di verify_delivery_code. Intanto la
-- schermata del giro dice, testualmente, «Il codice scade automaticamente».
-- Era una bugia scritta in buona fede.
--
-- Cautela: expires_at null vale come valido. Le righe storiche non devono
-- bloccare un giro in corso mentre applichiamo la migrazione.
create or replace function public.verify_delivery_code(p_order_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $fn$
declare o public.orders%rowtype; c public.order_delivery_codes%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if o.driver_id <> auth.uid() or o.stato not in ('arrivato', 'consegnato') then
    raise exception 'Azione non consentita';
  end if;

  select * into c from public.order_delivery_codes where order_id = p_order_id for update;
  if c.failed_attempts >= 5 then raise exception 'Troppi tentativi'; end if;

  if c.expires_at is not null and c.expires_at <= now() then
    raise exception 'Il codice è scaduto. Chiedi a chi ha lanciato il giro di farsene dare uno nuovo.';
  end if;

  if c.code <> trim(p_code) then
    update public.order_delivery_codes set failed_attempts = failed_attempts + 1 where order_id = p_order_id;
    insert into public.order_safety_events(order_id, actor_id, event_type)
      values (p_order_id, auth.uid(), 'code_failed');
    raise exception 'Codice errato';
  end if;

  if (select crediti_saldo from public.users where id = o.host_id) < o.crediti_offerti then
    raise exception 'BeerCoin insufficienti';
  end if;

  update public.order_delivery_codes set verified_at = now() where order_id = p_order_id;
  update public.orders set stato = 'confermato', host_confermato = true, driver_confermato = true, updated_at = now()
   where id = p_order_id;
  update public.users set crediti_saldo = crediti_saldo - o.crediti_offerti where id = o.host_id;
  update public.users set crediti_saldo = crediti_saldo + o.crediti_offerti where id = o.driver_id;
  insert into public.credit_transactions(order_id, from_user_id, to_user_id, importo, tipo)
    values (p_order_id, o.host_id, o.driver_id, o.crediti_offerti, 'consegna') on conflict do nothing;
  insert into public.order_safety_events(order_id, actor_id, event_type)
    values (p_order_id, auth.uid(), 'code_verified');
end $fn$;


-- ============================================================
-- A5. QUANDO UN ADMIN CHIUDE UN GIRO, LE DUE PERSONE LO SANNO
-- ============================================================
-- Prima metteva soltanto stato='annullato'. Restavano il congelamento (quindi
-- il giro non si poteva piu' toccare), il codice di consegna ancora valido, e
-- soprattutto due persone che continuavano ad aspettarsi sotto un portone
-- senza che niente dicesse loro che il giro era finito.
--
-- E' anche la correzione che rende sopportabile il difetto del feed PRIMA che
-- arrivi il bundle nuovo: la notifica arriva comunque.
create or replace function public.admin_cancel_order(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $fn$
declare o public.orders%rowtype; v_dest uuid[];
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Giro inesistente'; end if;
  if o.stato = 'confermato' then raise exception 'Un giro già concluso non si annulla'; end if;

  update public.orders
     set stato = 'annullato', congelato = false, updated_at = now()
   where id = p_order_id;

  delete from public.order_delivery_codes where order_id = p_order_id;
  delete from public.order_presence where order_id = p_order_id;

  insert into public.admin_audit(admin_id, action, target_type, target_id, reason)
    values (auth.uid(), 'cancel_order', 'order', p_order_id, p_reason);
  insert into public.order_safety_events(order_id, actor_id, event_type, metadata)
    values (p_order_id, auth.uid(), 'cancelled',
            jsonb_build_object('reason', 'admin', 'details', left(coalesce(p_reason, ''), 500)));

  v_dest := array_remove(array[o.host_id, o.driver_id], null);
  perform public.avvisa(
    v_dest, 'safety', 'Il giro è stato chiuso',
    'Lo ha chiuso l''amministrazione. Non aspettare nessuno. ' ||
    case when coalesce(trim(p_reason), '') = '' then 'Se non capisci perché, scrivici dal profilo.'
         else 'Motivo: ' || trim(p_reason) end,
    '/request/' || p_order_id::text,
    'giro-chiuso-' || p_order_id::text);
end $fn$;

grant execute on function public.admin_cancel_order(uuid, text) to authenticated;


-- ============================================================
-- A6. ANNULLARE UN GIRO SENZA CANCELLARE LE PROVE
-- ============================================================
-- Oggi l'app cancella il giro con una DELETE diretta dal client. Conseguenze:
-- il giro non finisce mai in 'annullato', quindi sparisce dalle statistiche e
-- dalla scheda della persona; e le segnalazioni collegate perdono il
-- riferimento. Chi ha lanciato un giro segnalato puo' far sparire le prove
-- finche' e' ancora 'richiesto'.
--
-- ATTENZIONE — LA POLICY DELETE NON SI REVOCA QUI.
-- I telefoni che non hanno ancora ricevuto il bundle nuovo continuano a
-- chiamare la DELETE: revocarla adesso farebbe esplodere il loro pulsante
-- «Annulla richiesta» con un errore grezzo. La revoca e' un compito
-- dell'Ondata 2, dopo due settimane piene di OTA:
--     drop policy if exists "orders_delete" on public.orders;
--
-- Copre anche il buco dell'altra meta': chi lancia un giro NON poteva
-- annullarlo dopo che qualcuno l'aveva accettato. Doveva aspettare 24 ore.
create or replace function public.annulla_giro_mio(p_order_id uuid, p_motivo text default '')
returns void language plpgsql security definer set search_path = public as $fn$
declare o public.orders%rowtype; v_nome text;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Giro inesistente'; end if;
  if o.host_id <> auth.uid() then raise exception 'Puoi annullare solo i giri che hai lanciato tu'; end if;

  if o.stato not in ('richiesto', 'accettato') then
    raise exception 'Questo giro è già partito. Usa «Devo fermare il giro», così chi porta viene avvisato subito.';
  end if;

  -- Se qualcuno ha gia' accettato, potrebbe essere gia' uscito di casa o aver
  -- gia' comprato le birre: il motivo non e' burocrazia, e' la sola cosa che
  -- gli spiega perche'.
  if o.driver_id is not null and char_length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Qualcuno ha già accettato: scrivi due parole sul perché, le legge lui.';
  end if;

  update public.orders set stato = 'annullato', updated_at = now() where id = p_order_id;
  delete from public.order_delivery_codes where order_id = p_order_id;
  delete from public.order_presence where order_id = p_order_id;

  insert into public.order_safety_events(order_id, actor_id, event_type, metadata)
    values (p_order_id, auth.uid(), 'cancelled',
            jsonb_build_object('reason', 'host', 'details', left(trim(coalesce(p_motivo, '')), 500)));

  if o.driver_id is not null then
    select nome into v_nome from public.users where id = o.host_id;
    perform public.avvisa(
      array[o.driver_id], 'order', 'Il giro è stato annullato',
      coalesce(v_nome, 'Chi aveva chiesto') || ' ha annullato: ' ||
      coalesce(nullif(trim(p_motivo), ''), 'non ha detto perché') ||
      '. Non comprare niente, e se hai già speso scrivigli in chat.',
      '/request/' || p_order_id::text,
      'giro-annullato-' || p_order_id::text);
  end if;
end $fn$;

grant execute on function public.annulla_giro_mio(uuid, text) to authenticated;

-- E chiudere un giro consegnato ma mai confermato: prima non poteva nessuno,
-- e restava aperto finche' non passavano 24 ore.
create or replace function public.cancel_active_order(p_order_id uuid, p_reason text, p_details text default '')
returns void language plpgsql security definer set search_path = public as $fn$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if auth.uid() not in (o.host_id, o.driver_id)
     or o.stato not in ('in_consegna', 'arrivato', 'consegnato') then
    raise exception 'Annullamento non consentito';
  end if;
  if p_reason not in ('emergenza','guasto','incidente','non_sicuro','richiesta_non_conforme','altro_serio') then
    raise exception 'Scegli un motivo serio';
  end if;
  if p_reason = 'altro_serio' and char_length(trim(p_details)) < 10 then
    raise exception 'Descrivi brevemente il problema';
  end if;

  update public.orders set stato = 'annullato', updated_at = now() where id = p_order_id;
  insert into public.order_safety_events(order_id, actor_id, event_type, metadata)
    values (p_order_id, auth.uid(), 'cancelled',
            jsonb_build_object('reason', p_reason, 'details', left(trim(p_details), 500)));
end $fn$;

grant execute on function public.cancel_active_order(uuid, text, text) to authenticated;

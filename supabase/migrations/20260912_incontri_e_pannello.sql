-- ============================================================
-- INCONTRI CHE SI POSSONO CHIUDERE, E UN PANNELLO CHE SMETTE DI SUONARE
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- ============================================================


-- ============================================================
-- 1. IL NUMERO SULL'ICONA DELLE SEGNALAZIONI NON SPARIVA MAI
-- ============================================================
-- Il pallino rosso sopra «Segnalazioni» restava acceso anche dopo aver chiuso
-- tutto. Il motivo, in una riga:
--
--   'segnalazioni_aperte', (select count(*) from public.reports)
--
-- Contava TUTTE le segnalazioni mai ricevute, non quelle aperte. La colonna
-- `stato` esiste da 20260902, ma questa query e' piu' vecchia e nessuno l'ha
-- aggiornata: il contatore diceva la verita' su una domanda che nessuno aveva
-- fatto.
--
-- Un allarme che non si puo' spegnere e' un allarme che si impara a ignorare —
-- ed e' il pannello da cui si moderano le segnalazioni di sicurezza.
--
-- Rigenerata dal testo dell'ultima definizione (supabase/schema.sql), non
-- riscritta a memoria: cambiano due righe.
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin) then
    raise exception 'Accesso negato';
  end if;

  return jsonb_build_object(
    'utenti_totali',        (select count(*) from public.users),
    'utenti_sospesi',       (select count(*) from public.users where sospeso_fino > now()),
    -- la scadenza la decide orders.scade_il (20260907), non piu' un intervallo
    'richieste_aperte',     (select count(*) from public.orders
                              where stato = 'richiesto' and scade_il > now()
                                and stato_moderazione = 'ok'),
    'ordini_in_corso',      (select count(*) from public.orders
                              where stato in ('accettato','in_consegna','arrivato','consegnato')),
    'scambi_completati',    (select count(*) from public.orders where stato = 'confermato'),
    'richieste_oscurate',   (select count(*) from public.orders where stato_moderazione = 'oscurato'),
    'negozi_approvati',     (select count(*) from public.shops where stato = 'approvato'),
    'negozi_in_attesa',     (select count(*) from public.shops where stato = 'in_attesa'),
    'crediti_totali',       (select coalesce(sum(crediti_saldo), 0) from public.users),
    'crediti_scambiati_7g', (select coalesce(sum(importo), 0) from public.credit_transactions
                              where created_at > now() - interval '7 days'),
    'utenti_per_citta',     (select coalesce(jsonb_object_agg(coalesce(citta,'sconosciuta'), n), '{}'::jsonb)
                              from (select citta, count(*) n from public.users group by citta) t),
    'crediti_per_citta',    (select coalesce(jsonb_object_agg(coalesce(citta,'sconosciuta'), n), '{}'::jsonb)
                              from (select citta, sum(crediti_saldo) n from public.users group by citta) t),
    -- SOLO QUELLE APERTE. Era `count(*)` su tutta la tabella.
    'segnalazioni_aperte',  (select count(*) from public.reports where stato <> 'chiusa'),
    -- Nuovo: gli incontri da guardare. Zero finche' non c'e' niente da fare.
    'incontri_aperti',      (select count(*) from public.events
                              where stato = 'aperto' and quando > now())
  );
end $fn$;


-- ============================================================
-- 2. UN INCONTRO SI PUO' ANNULLARE
-- ============================================================
-- Chi organizza non poteva ne' modificare ne' cancellare: un incontro
-- pubblicato per sbaglio, o saltato, restava li' a far presentare la gente in
-- un posto dove non c'era nessuno. E nemmeno gli amministratori potevano
-- toglierlo.
--
-- Non si CANCELLA la riga: si annulla. Chi si era iscritto ha diritto di
-- sapere che e' saltato, e una riga cancellata non puo' avvisare nessuno.
create or replace function public.annulla_incontro(p_id uuid, p_motivo text default '')
returns void language plpgsql security definer set search_path = public as $fn$
declare
  e public.events%rowtype;
  v_admin boolean := public.is_admin_user();
  v_nome  text;
  v_dest  uuid[];
begin
  select * into e from public.events where id = p_id for update;
  if not found then raise exception 'Incontro inesistente'; end if;

  if e.host_id <> auth.uid() and not v_admin then
    raise exception 'Puoi annullare solo gli incontri che hai proposto tu';
  end if;
  if e.stato = 'annullato' then return; end if;

  -- Un amministratore che chiude l'incontro di qualcun altro deve dire perche':
  -- lo legge chi lo aveva organizzato, e resta scritto.
  if v_admin and e.host_id <> auth.uid()
     and char_length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Serve una motivazione: la legge chi lo aveva proposto.';
  end if;

  update public.events set stato = 'annullato' where id = p_id;

  select nome into v_nome from public.users where id = e.host_id;

  -- Avvisa chi partecipa, e chi lo aveva organizzato se a chiudere e' un admin.
  select array_agg(user_id) into v_dest
    from public.event_participants where event_id = p_id and user_id <> auth.uid();
  if v_admin and e.host_id <> auth.uid() then
    v_dest := coalesce(v_dest, array[]::uuid[]) || e.host_id;
  end if;

  if v_dest is not null and array_length(v_dest, 1) > 0 then
    perform public.avvisa(v_dest, 'event',
      e.titolo || ': annullato',
      case when v_admin and e.host_id <> auth.uid()
           then 'Lo ha chiuso l''amministrazione. Motivo: ' || trim(p_motivo)
           else 'Lo ha annullato ' || coalesce(v_nome, 'chi lo aveva proposto') || '. Non andare.' end,
      '/event/' || p_id::text,
      'incontro-annullato-' || p_id::text);
  end if;

  if v_admin then
    insert into public.admin_audit(admin_id, action, target_type, target_id, reason)
    values (auth.uid(), 'annulla_incontro', 'event', p_id, trim(coalesce(p_motivo, '')));
  end if;
end $fn$;

grant execute on function public.annulla_incontro(uuid, text) to authenticated;


-- ============================================================
-- 3. GLI INCONTRI, PER CHI MODERA
-- ============================================================
-- Il pannello non aveva nessun modo di vederli. Un incontro con la locandina
-- sbagliata, o in un posto che non esiste, era invisibile a chi modera finche'
-- qualcuno non lo segnalava.
create or replace function public.admin_incontri()
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id,
      'tipo', e.tipo,
      'titolo', e.titolo,
      'quando', e.quando,
      'luogo', e.luogo,
      'citta', e.citta,
      'stato', e.stato,
      'posti', e.posti,
      'partecipanti', (select count(*) from public.event_participants p where p.event_id = e.id),
      'host_id', e.host_id,
      'host_nome', u.nome
    ) order by e.quando desc), '[]'::jsonb)
    from public.events e
    join public.users u on u.id = e.host_id
    where e.quando > now() - interval '30 days'
  );
end $fn$;

grant execute on function public.admin_incontri() to authenticated;

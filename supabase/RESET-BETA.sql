-- ============================================================
-- ⚠️  CANCELLA I DATI DELLA BETA — NON È REVERSIBILE  ⚠️
--
-- Questo file NON sta in migrations/ di proposito: non deve mai partire da
-- solo insieme alle altre migrazioni. Si esegue a mano, una volta, quando si
-- vuole ripulire il campo prima di aprire la beta vera.
--
-- COSA CANCELLA
--   tutti gli account tranne quelli che elenchi tu, e con loro giri, chat,
--   recensioni, movimenti BeerCoin, segnalazioni, eventi, inviti, notifiche.
--
-- COSA CONSERVA
--   la struttura del database, le funzioni, i badge, le missioni e i NEGOZI
--   mappati dalla community (sono lavoro vero fatto da persone: si buttano
--   solo se lo decidi esplicitamente, vedi in fondo).
--
-- PRIMA DI ESEGUIRE
--   1. Scrivi qui sotto le email da tenere (almeno la tua e quella di Angelo).
--   2. Metti v_confermo := true.
--   3. Se ti interessa conservare qualcosa, esportalo prima: sul piano
--      gratuito di Supabase non c'è un ripristino a un istante preciso.
-- ============================================================

do $$
declare
  -- ↓↓↓ MODIFICA QUESTE RIGHE ↓↓↓

  -- MODO A — tieni alcuni account: elenca qui le loro email.
  -- MODO B — azzera TUTTO: lascia v_azzera_tutto := true e ignora l'elenco.
  v_tenere       text[] := array[
    'scrivi-qui-la-tua-email@esempio.it',
    'scrivi-qui-email-di-angelo@esempio.it'
  ];
  v_azzera_tutto boolean := false;
  v_confermo     boolean := false;

  -- ↑↑↑ MODIFICA QUESTE RIGHE ↑↑↑

  v_cancellati int;
  v_rimasti    int;
begin
  if not v_confermo then
    raise exception 'Sicurezza: metti v_confermo := true quando hai deciso cosa fare.';
  end if;

  if v_azzera_tutto then
    -- Nessun account sopravvive. Dopo, il PRIMO che si registra entra senza
    -- invito (il cancello si apre solo se il database è vuoto: senza questa
    -- eccezione non potrebbe entrare più nessuno, perché non c'è chi invita).
    -- Fallo quindi PRIMA di distribuire l'app, e registra subito il tuo account.
    delete from auth.users;
    get diagnostics v_cancellati = row_count;
  else
    if array_length(v_tenere, 1) is null then
      raise exception 'Sicurezza: l''elenco delle email da tenere è vuoto. Se vuoi cancellare tutto, usa v_azzera_tutto := true.';
    end if;
    if exists (select 1 from unnest(v_tenere) e where e like 'scrivi-qui%') then
      raise exception 'Sicurezza: hai lasciato le email di esempio. Mettici quelle vere.';
    end if;
    if not exists (select 1 from auth.users where email = any(v_tenere)) then
      raise exception 'Nessuna delle email indicate esiste: controlla di non esserti sbagliato, o resteresti fuori dalla tua stessa app.';
    end if;

    -- Via gli account non elencati. Le chiavi esterne con "on delete cascade"
    -- portano con sé profilo, giri, chat, recensioni e movimenti.
    delete from auth.users where email <> all(v_tenere);
    get diagnostics v_cancellati = row_count;
  end if;

  -- 2. Ripulisce ciò che resta legato a chi teniamo: vogliamo un campo pulito,
  --    non i loro giri di prova.
  delete from public.messages;
  delete from public.direct_messages;
  delete from public.reviews;
  delete from public.compliments;
  delete from public.reports;
  delete from public.order_issues;
  delete from public.order_safety_events;
  delete from public.order_presence;
  delete from public.order_trusted_contacts;
  delete from public.order_delivery_codes;
  delete from public.orders;
  delete from public.credit_transactions;
  delete from public.notification_inbox;
  delete from public.event_participants;
  delete from public.event_waitlist;
  delete from public.events;
  delete from public.blocks;
  delete from public.invites;
  delete from public.user_missions;
  delete from public.product_feedback;

  -- 3. Riporta chi resta alla condizione di partenza: 10 BeerCoin, nessun
  --    rating ereditato da scambi che non esistono più.
  update public.users
    set crediti_saldo = 10,
        rating_medio  = 0,
        sospeso_fino  = null,
        referred_by   = null;

  -- 4. Rida a ciascuno il suo invito (agli admin la scorta piena).
  perform public.ensure_invites_for(id) from public.users;

  select count(*) into v_rimasti from public.users;
  raise notice 'Fatto: % account cancellati, % rimasti.', v_cancellati, v_rimasti;
end $$;

-- ============================================================
-- DOPO IL RESET — rendere amministratore un account
--
-- Da eseguire SEPARATAMENTE, dopo esserti registrato dall'app.
-- Un amministratore ha sempre inviti disponibili (servono a seminare la beta),
-- vede il pannello di moderazione e può gestire le segnalazioni.
--
-- Sostituisci l'email e lancia solo questa riga:
-- ============================================================
-- update public.users set is_admin = true
--   where id = (select id from auth.users where email = 'tua-email@esempio.it');

-- Controllo di chi è amministratore adesso:
-- select u.nome, au.email, u.is_admin
--   from public.users u join auth.users au on au.id = u.id
--   where u.is_admin;

-- ============================================================
-- FACOLTATIVO — solo se vuoi buttare anche i negozi mappati
-- Sono segnalazioni fatte da persone vere: valgono, e ricostruirle costa
-- fatica. Scommenta solo se sei sicuro.
-- ============================================================
-- delete from public.shops;

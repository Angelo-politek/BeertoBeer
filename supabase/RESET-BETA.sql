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
  -- ↓↓↓ MODIFICA QUESTE DUE RIGHE ↓↓↓
  v_tenere  text[] := array[
    'scrivi-qui-la-tua-email@esempio.it',
    'scrivi-qui-email-di-angelo@esempio.it'
  ];
  v_confermo boolean := false;
  -- ↑↑↑ MODIFICA QUESTE DUE RIGHE ↑↑↑

  v_cancellati int;
  v_rimasti    int;
begin
  if not v_confermo then
    raise exception 'Sicurezza: metti v_confermo := true dopo aver scritto le email da tenere.';
  end if;
  if array_length(v_tenere, 1) is null then
    raise exception 'Sicurezza: l''elenco delle email da tenere è vuoto.';
  end if;
  if exists (select 1 from unnest(v_tenere) e where e like 'scrivi-qui%') then
    raise exception 'Sicurezza: hai lasciato le email di esempio. Mettici quelle vere.';
  end if;
  if not exists (select 1 from auth.users where email = any(v_tenere)) then
    raise exception 'Nessuna delle email indicate esiste: controlla di non esserti sbagliato, o resteresti fuori dalla tua stessa app.';
  end if;

  -- 1. Via gli account non elencati. Le chiavi esterne con "on delete cascade"
  --    portano con sé profilo, giri, chat, recensioni e movimenti.
  delete from auth.users where email <> all(v_tenere);
  get diagnostics v_cancellati = row_count;

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
-- FACOLTATIVO — solo se vuoi buttare anche i negozi mappati
-- Sono segnalazioni fatte da persone vere: valgono, e ricostruirle costa
-- fatica. Scommenta solo se sei sicuro.
-- ============================================================
-- delete from public.shops;

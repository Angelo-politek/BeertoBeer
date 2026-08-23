-- ============================================================
-- ⚠️  CANCELLA I DATI DELLA BETA — NON È REVERSIBILE  ⚠️
--
-- Questo file NON sta in migrations/ di proposito: non deve mai partire da
-- solo insieme alle altre migrazioni. Si esegue a mano, una volta, quando si
-- vuole ripulire il campo prima di aprire la beta vera.
--
-- COSA CANCELLA
--   gli account (tutti, o tutti tranne quelli che elenchi tu) e con loro giri,
--   chat, recensioni, movimenti BeerCoin, segnalazioni, eventi, inviti,
--   notifiche e registro delle azioni admin.
--
-- COSA CONSERVA
--   la struttura del database, le funzioni, i badge, le missioni e i NEGOZI
--   mappati dalla community (sono lavoro vero fatto da persone; sopravvivono
--   anche alla cancellazione di chi li ha segnalati). Per buttare anche quelli
--   c'è una riga da scommentare in fondo.
--
-- PRIMA DI ESEGUIRE
--   1. Scegli il modo (vedi sotto) e metti v_confermo := true.
--   2. Se ti interessa conservare qualcosa, esportalo prima: sul piano
--      gratuito di Supabase non c'è un ripristino a un istante preciso.
-- ============================================================

do $$
declare
  -- ↓↓↓ MODIFICA QUESTE RIGHE ↓↓↓

  -- MODO A — tieni alcuni account: elenca qui le loro email.
  -- MODO B — azzera TUTTO: metti v_azzera_tutto := true (l'elenco viene ignorato).
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

  if not v_azzera_tutto then
    if array_length(v_tenere, 1) is null then
      raise exception 'Sicurezza: l''elenco delle email da tenere è vuoto. Se vuoi cancellare tutto, usa v_azzera_tutto := true.';
    end if;
    if exists (select 1 from unnest(v_tenere) e where e like 'scrivi-qui%') then
      raise exception 'Sicurezza: hai lasciato le email di esempio. Mettici quelle vere.';
    end if;
    if not exists (select 1 from auth.users where email = any(v_tenere)) then
      raise exception 'Nessuna delle email indicate esiste: controlla di non esserti sbagliato, o resteresti fuori dalla tua stessa app.';
    end if;
  end if;

  -- ------------------------------------------------------------
  -- 1. Svuota le tabelle operative PRIMA di toccare gli account.
  --
  -- L'ordine conta: non tutte le tabelle si cancellano da sole quando sparisce
  -- l'utente. `admin_audit` (il registro delle azioni degli amministratori)
  -- punta a users SENZA cancellazione a cascata, e da solo basta a far fallire
  -- l'intera operazione con un errore di chiave esterna.
  -- ------------------------------------------------------------
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
  delete from public.admin_audit;

  -- `referred_by` è un riferimento di users verso users: se un account ne
  -- indica un altro, la cancellazione si blocca. Azzerarlo prima toglie il nodo.
  update public.users set referred_by = null;

  -- ------------------------------------------------------------
  -- 2. Ora gli account.
  -- ------------------------------------------------------------
  if v_azzera_tutto then
    -- Nessun account sopravvive. Dopo, il PRIMO che si registra entra senza
    -- invito (il cancello si apre solo se il database è vuoto: senza questa
    -- eccezione non potrebbe entrare più nessuno, perché non c'è chi invita).
    -- Fallo quindi PRIMA di distribuire l'app, e registrati subito.
    delete from auth.users;
  else
    delete from auth.users where email <> all(v_tenere);
  end if;
  get diagnostics v_cancellati = row_count;

  -- ------------------------------------------------------------
  -- 3. Chi resta torna alla condizione di partenza.
  -- ------------------------------------------------------------
  update public.users
    set crediti_saldo = 10,
        rating_medio  = 0,
        sospeso_fino  = null;

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
-- fatica. Sopravvivono al reset di proposito. Scommenta solo se sei sicuro.
-- ============================================================
-- delete from public.shops;

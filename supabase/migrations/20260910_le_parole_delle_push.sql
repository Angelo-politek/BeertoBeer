-- ============================================================
-- LE PAROLE CHE ARRIVANO A TELEFONO SPENTO
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- Nessuna schermata cambia: le push le legge il telefono, non l'app. Si puo'
-- applicare anche mentre i tester girano su un bundle vecchio.
-- ============================================================
--
-- Le notifiche sono l'unica voce di Beer to Beer che raggiunge una persona che
-- non ha l'app aperta — e sono l'unica parte del progetto mai riscritta dai
-- tempi della gamification. Dicevano ancora «driver», «richiesta», «crediti»,
-- avevano un punto esclamativo ogni due frasi e nove emoji diverse.
--
-- TRE DECISIONI, E VALGONO PER TUTTE.
--
-- 1. NESSUNA EMOJI. Non e' una questione di gusto. La brand bible impone che
--    le icone siano «outline, bianco, 2-3px, disegnate a mano, mai glossy, 3D,
--    gradient» — e un'emoji di sistema E' un glifo glossy multicolore
--    disegnato da qualcun altro. Metterla in un titolo significa spedire il
--    set di icone di Google dentro il nostro marchio. E poi: 🍺 in un titolo
--    spende il carattere piu' visibile per dire «birra» a una persona che ha
--    gia' un'app di birra installata.
--    La cosa che distingue una notifica di Beer to Beer da una di Glovo e' che
--    dentro c'e' il nome di una persona.
--
-- 2. NESSUN PUNTO ESCLAMATIVO. Nessuno degli esempi ufficiali del marchio ne
--    ha uno: punti fermi e una domanda. Il punto esclamativo e' il rumore di
--    fondo di ogni app di delivery e di ogni programma fedelta': e' la cosa
--    che ci fa somigliare a loro piu' delle emoji.
--
-- 3. IL TITOLO E' CHI PARLA, quando c'e' una persona. Il corpo dice cosa puoi
--    fare. Massimo ~90 caratteri: e' quanto Android mostra a schermo bloccato.
--
-- COSTA UNA RIGA IN PIU' PER TRIGGER — un `select nome from users` — e vale il
-- prezzo: e' la differenza fra una notifica di sistema e un messaggio da una
-- persona, che e' tutto il progetto.


-- ============================================================
-- 1. IL CICLO DI UN GIRO
-- ============================================================
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_driver text;
  v_host   text;
begin
  if new.stato is not distinct from old.stato then return new; end if;

  select nome into v_driver from public.users where id = new.driver_id;
  select nome into v_host   from public.users where id = new.host_id;

  if new.stato = 'accettato' then
    perform public.push_to_users(array[new.host_id],
      coalesce(v_driver, 'Qualcuno') || ' porta le tue birre',
      'Ha accettato il tuo giro. Mettetevi d''accordo in chat.',
      '/request/' || new.id);

  elsif new.stato = 'in_consegna' then
    -- «e' partito» concordava al maschile con meta' della community.
    perform public.push_to_users(array[new.host_id],
      coalesce(v_driver, 'Chi porta') || ' è per strada',
      'Le tue birre sono partite.',
      '/request/' || new.id);

  elsif new.stato = 'consegnato' then
    perform public.push_to_users(array[new.host_id],
      'Confermi?',
      coalesce(v_driver, 'Chi porta') || ' dice di avertele consegnate. Conferma, e i BeerCoin passano.',
      '/request/' || new.id);

  elsif new.stato = 'confermato' and new.driver_id is not null then
    perform public.push_to_users(array[new.host_id, new.driver_id],
      'Giro chiuso',
      'BeerCoin passati. Se hai due minuti, lascia una recensione.',
      '/request/' || new.id);

  elsif new.stato = 'annullato' then
    -- Non c'era: un giro si annullava e chi stava dall'altra parte lo scopriva
    -- riaprendo l'app, o non lo scopriva affatto.
    perform public.push_to_users(
      array_remove(array[new.host_id, new.driver_id], null),
      'Giro annullato',
      'Non aspettare nessuno. Apri il giro per vedere cosa è successo.',
      '/request/' || new.id);
  end if;

  return new;
end $fn$;


-- ============================================================
-- 2. QUALCUNO CHIEDE BIRRE IN CITTA'
-- ============================================================
-- Era «🍺 Qualcuno ha bisogno di birre!» — un titolo che spende il carattere
-- piu' visibile per dire una cosa che chi legge sa gia'. Adesso il titolo dice
-- CHI e DOVE, e il corpo dice a chi conviene aprirla.
create or replace function public.notify_new_request()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_ids  uuid[];
  v_nome text;
begin
  if new.citta is null then return new; end if;

  select array_agg(u.id) into v_ids
    from public.users u
    where u.citta = new.citta
      and u.id <> new.host_id
      and not public.pair_blocked(u.id, new.host_id);

  select nome into v_nome from public.users where id = new.host_id;

  perform public.push_to_users(v_ids,
    coalesce(v_nome, 'Qualcuno') || ' chiede birre a ' || initcap(new.citta),
    'Se stai passando da un negozio, il giro è tuo.',
    '/request/' || new.id);
  return new;
end $fn$;


-- ============================================================
-- 3. I MESSAGGI
-- ============================================================
-- Stesso evento, due voci: la chat di un giro diceva «Nuovo messaggio», quella
-- diretta diceva il nome di chi scrive. Vince il nome — ed e' la push piu'
-- frequente dell'app, quindi era anche la voce sbagliata piu' spesso.
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_receiver uuid;
  v_sender   text;
begin
  select case when o.host_id = new.sender_id then o.driver_id else o.host_id end
    into v_receiver
    from public.orders o
   where o.id = new.order_id;

  if v_receiver is null then return new; end if;

  select nome into v_sender from public.users where id = new.sender_id;

  perform public.push_to_users(
    array[v_receiver],
    coalesce(v_sender, 'Messaggio'),
    left(new.testo, 120),
    '/chat/' || new.order_id);
  return new;
end $fn$;


-- ============================================================
-- 4. LE SEGNALAZIONI, PER CHI MODERA
-- ============================================================
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

    -- Auto-oscuramento del CONTENUTO, mai della persona: la sospensione resta
    -- un atto umano, con una motivazione scritta. (Vedi 20260906_scudo_beta.)
    if v_host = new.reported_user_id and v_stato = 'richiesto' and not v_approvato then
      update public.orders
         set stato_moderazione = 'oscurato', updated_at = now()
       where id = new.order_id;
    end if;
  end if;

  return new;
end $fn$;


-- ============================================================
-- 5. LE PUSH CHE PARLANO DI FUNZIONI CHE NON ESISTONO PIU'
-- ============================================================
-- Livelli, badge e «zone conquistate» sono stati spenti in TypeScript a
-- settembre — LEVELS ridotto a un elemento, BADGES svuotato — e sono rimasti
-- vivi nel database. Una persona puo' ricevere ADESSO, sul telefono, una
-- notifica su un badge che l'app non ha nessuna schermata per mostrare.
--
-- Le due funzioni qui sotto sono RIGENERATE dal testo dell'ultima definizione
-- (20260703_gamification.sql), non riscritte a memoria: tengono la
-- contabilita' — i badge continuano a registrarsi, i punteggi di zona a
-- salire, cosi' lo storico non si spezza — e perdono soltanto le push.
-- E' la stessa regola che vale per ogni funzione di questo progetto.
--
-- ⚠️ Le firme sono quelle originali, parametri compresi: `unlock_badge` usa
--    `p_badge_key` (PostgreSQL rifiuta di rinominare un parametro) e
--    `bump_zone_score` prende quattro argomenti. Sbagliarle non darebbe un
--    errore: creerebbe un OVERLOAD, e la versione vecchia continuerebbe a
--    mandare notifiche.

create or replace function public.unlock_badge(p_user uuid, p_badge_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int := 0;
  v_reward int;
begin
  if p_user is null then return; end if;

  insert into public.user_badges (user_id, badge_key)
  values (p_user, p_badge_key)
  on conflict (user_id, badge_key) do nothing;

  get diagnostics v_rows = row_count;  -- 1 = inserito nuovo, 0 = gia' presente
  if v_rows = 0 then return; end if;

  select reward_pt into v_reward from public.badges where key = p_badge_key;
  if not found then return; end if;

  if coalesce(v_reward, 0) > 0 then
    perform public.award_tokens(p_user, v_reward, 'badge', p_badge_key);
  end if;

  -- NIENTE PUSH. Diceva «Badge sbloccato!» con un'emoji e i «PT», che sono la
  -- moneta di due versioni fa, e portava a una schermata che i badge non li
  -- mostra piu'.
exception when others then
  -- Best-effort: un errore qui non deve mai rompere il chiamante.
  null;
end;
$$;

create or replace function public.bump_zone_score(
  p_user uuid, p_citta text, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zona text;
  v_score int;
  v_holder uuid;
  v_holder_score int;
begin
  if p_user is null or p_citta is null then return; end if;
  v_zona := public.zone_label(p_lat, p_lng);

  insert into public.zone_scores (user_id, citta, zona, punteggio)
  values (p_user, p_citta, v_zona, 1)
  on conflict (user_id, citta, zona)
    do update set punteggio = public.zone_scores.punteggio + 1
  returning punteggio into v_score;

  select holder_user_id, punteggio into v_holder, v_holder_score
    from public.zone_holders where citta = p_citta and zona = v_zona;

  if v_holder is null or v_score > coalesce(v_holder_score, 0) then
    insert into public.zone_holders (citta, zona, holder_user_id, punteggio, updated_at)
    values (p_citta, v_zona, p_user, v_score, now())
    on conflict (citta, zona) do update
      set holder_user_id = excluded.holder_user_id,
          punteggio = excluded.punteggio,
          updated_at = now();

    if v_holder is distinct from p_user then
      perform public.unlock_badge(p_user, 'zone_king');
      -- NIENTE PUSH. «Hai conquistato una zona» e «Ti hanno soffiato una zona
      -- · Riprenditela!» erano una classifica di quartiere con due punti
      -- esclamativi: esattamente il tipo di gamification che questo progetto
      -- ha smesso di fare, e che nessuna schermata dell'app racconta piu'.
      null;
    end if;
  end if;
exception when others then
  null;
end;
$$;


-- ============================================================
-- 6. IL MARCHIO COMMERCIALE DENTRO I NOMI DEI BADGE
-- ============================================================
-- «Fattorino della Peroni», «Spaccia Peroni», «Ambasciatore Peroni». Un
-- marchio registrato dentro un progetto no-profit non e' un refuso: e' un
-- problema, e adesso il repository e' pubblico.
--
-- I badge non si cancellano — lo storico di chi li ha presi resta — ma
-- smettono di nominare un'azienda.
-- I tre badge sono questi, per chiave. Niente `replace` alla cieca: una
-- sostituzione di testo su una tabella lascia sempre qualcosa di storto.
update public.badges set nome = 'Cinque giri portati'
 where key = 'deliveries_5';
update public.badges set nome = 'Dieci giri portati'
 where key = 'deliveries_10';
update public.badges set nome = 'Hai portato dentro qualcuno'
 where key = 'ambassador';

-- E le emoji dei badge, che finivano dentro i titoli delle notifiche.
update public.badges set emoji = '' where emoji is not null and emoji <> '';

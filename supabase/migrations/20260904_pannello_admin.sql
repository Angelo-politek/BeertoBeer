-- BeerToBeer - il pannello di chi governa la beta (04/09/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- Legge soltanto: non modifica nessun dato esistente.
--
-- SEGNALAZIONI DEL COLLAUDO
--   «Rivedere e aggiornare tutto il pannello di amministrazione, in modo da
--    creare un tool potente e completo che gli admin possano usare per gestire
--    l'app, gli utenti, e soprattutto le segnalazioni»
--   «Pannello amministrazione sezione utenti, devo poter aprire il profilo
--    dell'utente cliccandolo»
--   «Voglio anche tutta una parte di statistiche e grafici»
--
-- COSA MANCAVA
-- Il pannello mostrava numeri singoli: 12 utenti, 3 giri aperti. Un numero da
-- solo non dice se le cose vanno meglio o peggio - per quello serve la serie
-- nel tempo. E per decidere su una segnalazione servono i PRECEDENTI della
-- persona, che non erano consultabili da nessuna parte.

-- ============================================================
-- 1. TUTTO SU UNA PERSONA, IN UNA CHIAMATA
-- ============================================================
-- Serve a decidere su una segnalazione: la terza volta che una persona viene
-- segnalata non e' come la prima, ma finora non c'era modo di saperlo.
create or replace function public.admin_scheda_utente(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
declare
  u public.users%rowtype;
  v_giri_chiesti int; v_giri_portati int; v_annullati int;
  v_ricevute int; v_fatte int;
  v_provvedimenti jsonb; v_segnalazioni jsonb; v_movimenti jsonb;
  v_invitato_da text;
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;

  select * into u from public.users where id = p_user_id;
  if not found then raise exception 'Persona inesistente'; end if;

  select count(*) into v_giri_chiesti from public.orders where host_id = p_user_id;
  select count(*) into v_giri_portati  from public.orders where driver_id = p_user_id and stato = 'confermato';
  select count(*) into v_annullati     from public.orders
   where (host_id = p_user_id or driver_id = p_user_id) and stato = 'annullato';

  select count(*) into v_ricevute from public.reports where reported_user_id = p_user_id;
  select count(*) into v_fatte    from public.reports where reporting_user_id = p_user_id;

  select nome into v_invitato_da from public.users where id = u.referred_by;

  select coalesce(jsonb_agg(x order by x->>'quando' desc), '[]'::jsonb) into v_provvedimenti
  from (
    select jsonb_build_object(
      'tipo', p.tipo, 'motivo', p.motivo, 'fino_a', p.fino_a, 'quando', p.created_at
    ) as x
    from public.provvedimenti p where p.user_id = p_user_id
    order by p.created_at desc limit 20
  ) t;

  select coalesce(jsonb_agg(x order by x->>'quando' desc), '[]'::jsonb) into v_segnalazioni
  from (
    select jsonb_build_object(
      'id', r.id, 'motivo', r.motivo_codice, 'gravita', r.gravita,
      'stato', r.stato, 'quando', r.created_at
    ) as x
    from public.reports r where r.reported_user_id = p_user_id
    order by r.created_at desc limit 20
  ) t;

  -- I movimenti sono su credit_transactions, che registra il PASSAGGIO fra due
  -- persone (from/to) e non un saldo per utente: il segno lo si ricava da
  -- quale dei due lati e' la persona che stiamo guardando.
  select coalesce(jsonb_agg(x order by x->>'quando' desc), '[]'::jsonb) into v_movimenti
  from (
    select jsonb_build_object(
      'delta', case when t.to_user_id = p_user_id then t.importo else -t.importo end,
      'motivo', t.tipo,
      'quando', t.created_at
    ) as x
    from public.credit_transactions t
    where t.to_user_id = p_user_id or t.from_user_id = p_user_id
    order by t.created_at desc limit 30
  ) t;

  return jsonb_build_object(
    'id', u.id,
    'nome', u.nome,
    'email', u.email,
    'citta', u.citta,
    'iscritto_il', u.created_at,
    'sospeso_fino', u.sospeso_fino,
    'is_admin', u.is_admin,
    'crediti', u.crediti_saldo,
    'rating', u.rating_medio,
    'invitato_da', v_invitato_da,
    'giri_chiesti', v_giri_chiesti,
    'giri_portati', v_giri_portati,
    'giri_annullati', v_annullati,
    'segnalazioni_ricevute', v_ricevute,
    'segnalazioni_fatte', v_fatte,
    'provvedimenti', v_provvedimenti,
    'segnalazioni', v_segnalazioni,
    'movimenti_crediti', v_movimenti
  );
end $fn$;

-- ============================================================
-- 2. L'ANDAMENTO NEL TEMPO
-- ============================================================
-- Un numero singolo non dice se le cose vanno meglio o peggio. La serie
-- giorno per giorno si'.
--
-- generate_series produce ANCHE i giorni in cui non e' successo niente: senza,
-- un grafico salterebbe i buchi e farebbe sembrare continuo un andamento che
-- ha giorni a zero - cioe' mentirebbe proprio dove serve guardare.
create or replace function public.admin_andamento(p_giorni int default 30)
returns table (
  giorno date,
  iscritti bigint,
  giri_creati bigint,
  giri_conclusi bigint,
  giri_annullati bigint,
  crediti_scambiati bigint
) language plpgsql security definer set search_path = public stable as $fn$
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;

  return query
  with giorni as (
    select generate_series(
      (current_date - (greatest(1, least(p_giorni, 90)) - 1))::date,
      current_date,
      interval '1 day'
    )::date as g
  )
  select
    d.g,
    (select count(*) from public.users u where u.created_at::date = d.g),
    (select count(*) from public.orders o where o.created_at::date = d.g),
    (select count(*) from public.orders o where o.stato = 'confermato' and o.updated_at::date = d.g),
    (select count(*) from public.orders o where o.stato = 'annullato'  and o.updated_at::date = d.g),
    (select coalesce(sum(o.crediti_offerti), 0) from public.orders o
      where o.stato = 'confermato' and o.updated_at::date = d.g)
  from giorni d
  order by d.g;
end $fn$;

-- ============================================================
-- 3. A CHE ORA SI BEVE
-- ============================================================
-- Serve a capire quando la citta' e' viva: se i giri si concentrano fra le 21
-- e le 23, e' li' che deve esserci gente disponibile a portare.
create or replace function public.admin_per_fascia_oraria()
returns table (ora int, giri bigint) language plpgsql security definer set search_path = public stable as $fn$
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  return query
  with ore as (select generate_series(0, 23) as h)
  select ore.h, (
    select count(*) from public.orders o
     where extract(hour from o.created_at) = ore.h
       and o.created_at > now() - interval '30 days'
  )
  from ore order by ore.h;
end $fn$;

-- ============================================================
-- 4. L'IMBUTO DELLA BETA
-- ============================================================
-- E' la misura vera di come sta andando: quanti inviti sono stati mandati,
-- quanti si sono iscritti, quanti hanno fatto ALMENO UN GIRO.
-- Chi si iscrive e non fa mai niente non e' un utente: e' un numero che
-- consola e basta.
create or replace function public.admin_imbuto()
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
declare
  v_inviti int; v_usati int; v_iscritti int;
  v_con_giro int; v_con_consegna int;
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;

  select count(*) into v_inviti from public.invites;
  select count(*) into v_usati  from public.invites where invited_user_id is not null;
  select count(*) into v_iscritti from public.users;

  select count(distinct host_id) into v_con_giro from public.orders;
  select count(distinct driver_id) into v_con_consegna
    from public.orders where stato = 'confermato' and driver_id is not null;

  return jsonb_build_object(
    'inviti_creati', v_inviti,
    'inviti_usati', v_usati,
    'iscritti', v_iscritti,
    'hanno_chiesto', v_con_giro,
    'hanno_portato', v_con_consegna
  );
end $fn$;

-- ============================================================
-- 5. LE SEGNALAZIONI GRAVI SUONANO DIVERSE
-- ============================================================
-- Segnalazione del collaudo: «gli admin devono ricevere una notifica
-- prioritaria per le segnalazioni in modo da vederle subito».
--
-- Su Android il canale decide suono, vibrazione e se la notifica compare sopra
-- le altre. Finora ce n'era uno solo, "messages": un «non mi sento al sicuro»
-- suonava identico a «hai un nuovo messaggio», e in mezzo a venti notifiche
-- uguali si perde.
--
-- push_to_users prende un parametro in piu' SENZA cambiare la vecchia forma a
-- quattro argomenti: i trigger che gia' la chiamano continuano a funzionare
-- senza toccarli. La versione a quattro delega a quella a cinque, cosi' la
-- logica resta una sola.
create or replace function public.push_to_users(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text,
  p_channel text
)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url    constant text := 'https://kjxahufzseybvxtfsiwu.supabase.co';
  v_secret text;
  v_dest   int := coalesce(array_length(p_user_ids, 1), 0);
  v_token  int := 0;
  v_nomi   text;
begin
  if p_user_ids is null or v_dest = 0 then
    insert into public.push_log (titolo, destinatari, esito, dettaglio)
      values (p_title, 0, 'saltata', 'nessun destinatario');
    return;
  end if;

  select string_agg(nome, ', ' order by nome) into v_nomi
    from public.users where id = any(p_user_ids);

  -- Quanti dei destinatari hanno davvero un telefono registrato: se è zero,
  -- il problema non è la notifica ma il fatto che nessuno la può ricevere.
  select count(*) into v_token from public.push_tokens where user_id = any(p_user_ids);
  if v_token = 0 then
    insert into public.push_log (titolo, destinatari, con_token, esito, dettaglio, destinatari_nomi)
      values (p_title, v_dest, 0, 'saltata', 'nessun destinatario ha un telefono registrato', v_nomi);
    return;
  end if;

  select value into v_secret from public.app_secrets where key = 'push_shared_secret';

  begin
    perform net.http_post(
      url := v_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', coalesce(v_secret, '')
      ),
      body := jsonb_build_object(
        'userIds', to_jsonb(p_user_ids),
        'title', p_title,
        'body', p_body,
        'url', p_url,
        'channel', coalesce(p_channel, 'messages')
      )
    );
    insert into public.push_log (titolo, destinatari, con_token, esito, destinatari_nomi)
      values (p_title, v_dest, v_token, 'inviata', v_nomi);
  exception when others then
    insert into public.push_log (titolo, destinatari, con_token, esito, dettaglio, destinatari_nomi)
      values (p_title, v_dest, v_token, 'errore', sqlerrm, v_nomi);
  end;
end; $$;

-- La vecchia forma a quattro argomenti resta, e delega: i trigger che gia' la
-- chiamano continuano a funzionare senza toccarli, e la logica resta una sola.
--
-- NOTA: questa funzione e' stata RIGENERATA dal testo di
-- 20260828_log_destinatari.sql invece che riscritta. Ribattendola a memoria
-- avevo gia' perso il controllo «nessuno dei destinatari ha un telefono
-- registrato» (che era il motivo per cui quella diagnostica esiste), il
-- search_path che serve a net.http_post, e avevo usato una colonna di push_log
-- che non esiste. E' il terzo caso in questo progetto: ridefinire una funzione
-- intera per cambiare due righe e' il momento in cui si perdono i controlli.
create or replace function public.push_to_users(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text
)
returns void language plpgsql security definer set search_path = public, extensions as $fn$
begin
  perform public.push_to_users(p_user_ids, p_title, p_body, p_url, 'messages');
end $fn$;

revoke all on function public.push_to_users(uuid[], text, text, text, text) from public, anon, authenticated;
revoke all on function public.push_to_users(uuid[], text, text, text) from public, anon, authenticated;

-- avvisa() manda le cose di sicurezza sul canale prioritario.
create or replace function public.avvisa(
  p_user_ids  uuid[],
  p_categoria text,
  p_titolo    text,
  p_corpo     text,
  p_url       text default null,
  p_dedupe    text default null
) returns void language plpgsql security definer set search_path = public, extensions as $fn$
declare v_uid uuid;
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return; end if;

  foreach v_uid in array p_user_ids loop
    insert into public.notification_inbox (user_id, dedupe_key, category, title, body, url)
    values (v_uid, p_dedupe, p_categoria, p_titolo, p_corpo, p_url)
    on conflict (user_id, dedupe_key) do nothing;
  end loop;

  perform public.push_to_users(
    p_user_ids, p_titolo, p_corpo, p_url,
    case when p_categoria = 'safety' then 'sicurezza' else 'messages' end
  );
end $fn$;

revoke all on function public.avvisa(uuid[], text, text, text, text, text) from public, anon, authenticated;

-- ============================================================
-- 5. PERMESSI
-- ============================================================
-- Il controllo vero e' is_admin_user() dentro ogni funzione: la concessione
-- serve solo a poterle chiamare, non a poterle usare.
grant execute on function public.admin_scheda_utente(uuid) to authenticated;
grant execute on function public.admin_andamento(int) to authenticated;
grant execute on function public.admin_per_fascia_oraria() to authenticated;
grant execute on function public.admin_imbuto() to authenticated;

-- BeerToBeer — riequilibrio BeerCoin e diagnostica notifiche (27/08/2026).
-- Eseguire DOPO 20260826_fix_feed.sql. Sicuro da rieseguire.

-- ============================================================
-- 1. BEERCOIN: consegnare deve essere l'unico modo serio di guadagnarli
--
-- Alla prima consegna si arrivava a oltre 20 BeerCoin, sommando: benvenuto 10,
-- pagamento del giro, badge "Primo Giro" 3, bonus livello 1 = 2, premio invito
-- 5. Con 20 BeerCoin in tasca si possono chiedere birre per giorni senza mai
-- portarne a nessuno — e un'app dove tutti chiedono e nessuno porta non
-- funziona: il feed si riempie di richieste che restano lì.
--
-- Principio: i BeerCoin si guadagnano PORTANDO. Tutto il resto diventa
-- simbolico. I numeri sono raccolti qui sotto: si cambiano in un posto solo.
-- ============================================================

-- Benvenuto: quanto basta per farsi portare qualcosa UNA volta e capire com'è.
-- Dopo, per averne ancora, bisogna portare.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_benvenuto constant int := 5;   -- era 10
  v_code    text := upper(btrim(coalesce(new.raw_user_meta_data->>'invito', '')));
  v_inviter uuid;
  v_esistono int;
begin
  select count(*) into v_esistono from public.users;

  -- Il primissimo iscritto di un database vuoto entra senza invito: senza
  -- questa eccezione nessuno potrebbe mai entrare (nessuno può invitarlo).
  if v_esistono > 0 then
    if v_code = '' then
      raise exception 'Per entrare in Beer to Beer serve un invito.';
    end if;
    select inviter_id into v_inviter
      from public.invites
      where code = v_code and used_at is null
      for update;
    if v_inviter is null then
      raise exception 'Invito non valido o già utilizzato.';
    end if;
  end if;

  insert into public.users (id, nome, data_nascita, crediti_saldo, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Utente'),
    (new.raw_user_meta_data->>'data_nascita')::date,
    v_benvenuto,
    v_inviter
  );

  if v_inviter is not null then
    update public.invites
      set invited_user_id = new.id, used_at = now()
      where code = v_code;
  end if;

  perform public.ensure_invites_for(new.id);

  begin
    insert into public.credit_transactions (from_user_id, to_user_id, importo, tipo)
    values (null, new.id, v_benvenuto, 'welcome');
  exception when others then
    null;
  end;

  return new;
end;
$$;

-- Badge: riconoscimenti, non stipendi. Ridotti a valori simbolici.
update public.badges set reward_pt = 1  where key = 'first_delivery';    -- era 3
update public.badges set reward_pt = 0  where key = 'first_request';     -- era 1
update public.badges set reward_pt = 2  where key = 'deliveries_5';      -- era 5
update public.badges set reward_pt = 3  where key = 'deliveries_10';     -- era 8
update public.badges set reward_pt = 5  where key = 'deliveries_25';     -- era 15
update public.badges set reward_pt = 1  where key = 'night_owl';         -- era 3
update public.badges set reward_pt = 2  where key = 'social_butterfly';  -- era 5
update public.badges set reward_pt = 0  where key = 'profile_complete';  -- era 2
update public.badges set reward_pt = 3  where key = 'zone_king';         -- era 10
update public.badges set reward_pt = 2  where key = 'ambassador';        -- era 5

-- Bonus di livello: erano 2 / 5 / 10 / 20, cioè 37 BeerCoin regalati lungo il
-- percorso. Ora 1 / 2 / 3 / 5.
-- Identica all'originale (conteggio scambi, notifica di livello e protezione
-- dagli errori compresi): cambiano SOLO gli importi. La protezione va tenuta:
-- senza, un problema nel bonus farebbe fallire la conferma di uno scambio.
create or replace function public.grant_level_bonus(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_scambi int; v_livello int; v_pagato int; v_bonus int;
begin
  select count(*) into v_scambi
    from public.orders
    where stato = 'confermato' and (host_id = p_user or driver_id = p_user);

  v_livello := public.level_for_scambi(v_scambi);
  select livello_pagato into v_pagato from public.users where id = p_user;

  while coalesce(v_pagato, 0) < v_livello loop
    v_pagato := v_pagato + 1;
    v_bonus := case v_pagato
      when 1 then 1 when 2 then 2 when 3 then 3 when 4 then 5 else 0 end;
    perform public.award_tokens(p_user, v_bonus, 'livello', 'livello ' || v_pagato);
    perform public.push_to_users(
      array[p_user], '⬆️ Nuovo livello!', 'Sei salito di livello: +' || v_bonus || ' BeerCoin.',
      '/(tabs)/profile');
  end loop;

  update public.users set livello_pagato = v_livello where id = p_user;
exception when others then
  null;
end $$;

-- Premio invito: da 5 a 3 per parte. Resta legato alla PRIMA CONSEGNA di chi
-- è entrato, non alla registrazione.
create or replace function public.reward_referral_first_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_inviter uuid; v_consegne int; v_premio constant int := 3;
begin
  if new.stato <> 'confermato' or old.stato = 'confermato' or new.driver_id is null then
    return new;
  end if;

  select referred_by into v_inviter from public.users where id = new.driver_id;
  if v_inviter is null then return new; end if;

  select count(*) into v_consegne
    from public.orders
    where driver_id = new.driver_id and stato = 'confermato';
  if v_consegne <> 1 then return new; end if;

  perform public.award_tokens(new.driver_id, v_premio, 'referral', 'primo giro dopo l''invito');
  perform public.award_tokens(v_inviter, v_premio, 'referral', 'chi hai invitato ha fatto il primo giro');
  perform public.push_to_users(
    array[v_inviter],
    'La tua scelta ha portato bene',
    'Chi hai invitato ha completato il primo giro: +' || v_premio || ' BeerCoin per entrambi.',
    '/beercoin'
  );
  return new;
exception when others then
  return new;
end $$;

-- ============================================================
-- 2. DIAGNOSTICA NOTIFICHE
--
-- push_to_users ingoiava ogni errore in silenzio: se una notifica non partiva,
-- non restava traccia da nessuna parte e non c'era modo di capire se il
-- problema fosse il trigger, il destinatario o il servizio. La notifica di
-- prova funziona ma quelle automatiche no: senza registro si va a tentoni.
--
-- Da qui in poi ogni tentativo lascia una riga: quanti destinatari aveva, se
-- la chiamata è partita e con quale errore. Leggibile dal SQL Editor.
-- ============================================================
create table if not exists public.push_log (
  id          bigserial primary key,
  creato_il   timestamptz not null default now(),
  titolo      text,
  destinatari int not null default 0,
  con_token   int not null default 0,
  esito       text not null,
  dettaglio   text
);

alter table public.push_log enable row level security;
-- Nessuna policy: ci arriva solo il SQL Editor e le funzioni SECURITY DEFINER.

create or replace function public.push_to_users(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text
)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url      constant text := 'https://kjxahufzseybvxtfsiwu.supabase.co';
  v_secret   text;
  v_dest     int := coalesce(array_length(p_user_ids, 1), 0);
  v_token    int := 0;
begin
  if p_user_ids is null or v_dest = 0 then
    insert into public.push_log (titolo, destinatari, esito, dettaglio)
      values (p_title, 0, 'saltata', 'nessun destinatario');
    return;
  end if;

  -- Quanti dei destinatari hanno davvero un telefono registrato: se è zero,
  -- il problema non è la notifica ma il fatto che nessuno la può ricevere.
  select count(*) into v_token from public.push_tokens where user_id = any(p_user_ids);
  if v_token = 0 then
    insert into public.push_log (titolo, destinatari, con_token, esito, dettaglio)
      values (p_title, v_dest, 0, 'saltata', 'nessun destinatario ha un telefono registrato');
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
        'url', p_url
      )
    );
    insert into public.push_log (titolo, destinatari, con_token, esito)
      values (p_title, v_dest, v_token, 'inviata');
  exception when others then
    -- Best-effort: nessun flusso applicativo deve fallire perché la push non
    -- parte. Ma da oggi lo sappiamo.
    insert into public.push_log (titolo, destinatari, con_token, esito, dettaglio)
      values (p_title, v_dest, v_token, 'errore', sqlerrm);
  end;
end; $$;

-- Per leggere il registro dal SQL Editor:
--   select * from public.push_log order by creato_il desc limit 30;

-- BeerToBeer — messa in sicurezza pre-beta (22/08/2026).
-- Eseguire DOPO 20260714_handshake_safety.sql. Sicuro da rieseguire.
--
-- Chiude tre problemi trovati rileggendo il codice prima della beta di Torino:
--   1. i BeerCoin di un giro aperto si potevano impegnare due volte;
--   2. la edge function delle push era chiamabile da chiunque su internet;
--   3. bloccare una persona non le impediva di presentarsi a casa tua.

-- ============================================================
-- 1. BEERCOIN IMPEGNATI
-- I BeerCoin si spostano solo alla conferma finale. Senza questo calcolo un
-- host con 10 BeerCoin poteva aprire due giri da 5: due driver compravano le
-- birre di tasca propria e al secondo la conferma falliva per saldo
-- insufficiente — dopo che aveva già speso soldi veri.
-- Un giro aperto o in corso ora IMPEGNA i suoi BeerCoin, e ogni controllo di
-- copertura guarda il DISPONIBILE invece del saldo lordo.
--
-- NB: sono volutamente SECURITY INVOKER. Con i diritti del chiamante la RLS
-- resta attiva, quindi nessuno può usarle per sbirciare il saldo altrui (per un
-- altro utente tornano 0). Dentro accept_order, che è SECURITY DEFINER, girano
-- con i diritti del proprietario e vedono tutto: che è ciò che serve lì.
-- ============================================================

create or replace function public.committed_credits(p_user uuid)
returns integer language sql stable as $$
  select coalesce(sum(crediti_offerti), 0)::int
  from public.orders
  where host_id = p_user
    and stato not in ('confermato', 'annullato');
$$;

create or replace function public.available_credits(p_user uuid)
returns integer language sql stable as $$
  select coalesce((select crediti_saldo from public.users where id = p_user), 0)
       - public.committed_credits(p_user);
$$;

grant execute on function public.committed_credits(uuid) to authenticated;
grant execute on function public.available_credits(uuid) to authenticated;

-- Creazione richiesta: copertura sul disponibile.
-- Il trigger è BEFORE INSERT, quindi la riga in arrivo non è ancora visibile a
-- committed_credits: non conta se stessa due volte.
create or replace function public.set_order_credits()
returns trigger language plpgsql as $$
declare
  v_disponibile integer;
  v_sospeso     timestamptz;
begin
  -- Moderazione: un utente sospeso non può creare nuove richieste.
  select sospeso_fino into v_sospeso from public.users where id = new.host_id;
  if v_sospeso > now() then
    raise exception 'Account sospeso fino al % per una segnalazione in verifica',
      to_char(v_sospeso, 'DD/MM HH24:MI');
  end if;

  new.crediti_offerti := public.credits_for_weight(new.lista_birre);

  v_disponibile := public.available_credits(new.host_id);
  if coalesce(v_disponibile, 0) < new.crediti_offerti then
    raise exception 'BeerCoin insufficienti: questo giro ne costa %, ne hai % disponibili (gli altri sono impegnati in giri ancora aperti)',
      new.crediti_offerti, coalesce(v_disponibile, 0);
  end if;

  return new;
end; $$;

-- Accettazione: verifica la copertura PRIMA che il driver compri le birre, e
-- rifiuta i giri di chi è stato bloccato.
create or replace function public.accept_order(
  p_order_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_d constant numeric := 0.5;  -- BeerCoin per km driver→consegna (mirror lib/credits.ts)
  v_host uuid; v_stato text; v_lat double precision; v_lng double precision; v_lista jsonb;
  v_offerti_ora int; v_weight int; v_bonus int := 0; v_dist numeric;
  v_capienza int; v_total int;
begin
  select host_id, stato, lat, lng, lista_birre, crediti_offerti
    into v_host, v_stato, v_lat, v_lng, v_lista, v_offerti_ora
    from public.orders where id = p_order_id for update;
  if not found then raise exception 'Ordine inesistente'; end if;
  if v_stato <> 'richiesto' then raise exception 'Ordine non più disponibile'; end if;
  if v_host = auth.uid() then raise exception 'Non puoi accettare un tuo ordine'; end if;

  -- Blocco in QUALSIASI direzione. Il feed già li nasconde (vista open_requests),
  -- ma questo è il gate vero: senza, bastava avere il link del giro.
  if public.pair_blocked(v_host, auth.uid()) then
    raise exception 'Non puoi accettare i giri di questa persona';
  end if;

  v_weight := public.credits_for_weight(v_lista);
  if p_lat is not null and p_lng is not null and v_lat is not null and v_lng is not null then
    v_dist := public.haversine_km(p_lat, p_lng, v_lat, v_lng);
    -- oltre 50 km è un glitch GPS o spoofing: niente bonus.
    if v_dist <= 50 then v_bonus := round(v_dist * v_d)::int; end if;
  end if;

  -- Capienza reale dell'host: il disponibile PIÙ quanto questo giro sta già
  -- impegnando (è aperto, quindi committed_credits lo conta già).
  v_capienza := public.available_credits(v_host) + coalesce(v_offerti_ora, 0);

  -- Prima questo si scopriva solo alla conferma, DOPO che il driver aveva
  -- comprato le birre. Ora lo sa adesso, che non ha ancora speso niente.
  if v_capienza < v_weight then
    raise exception 'Questo giro non è più coperto: l''host non ha abbastanza BeerCoin disponibili. Non comprare nulla.';
  end if;

  v_total := least(10, v_weight + v_bonus, v_capienza);

  update public.orders
    set driver_id = auth.uid(), stato = 'accettato',
        crediti_offerti = v_total, updated_at = now()
    where id = p_order_id;
end; $$;

-- ============================================================
-- 2. BLOCCHI — fuori dal feed
-- Stesse colonne di prima (create-or-replace le vuole identiche): cambia solo
-- l'ultima condizione. pair_blocked è SECURITY DEFINER e vede i blocchi in
-- entrambe le direzioni, quindi sparisce anche chi ha bloccato te.
-- ============================================================
-- drop + create, NON "create or replace": updated_at è stato aggiunto IN MEZZO
-- alle colonne, e create-or-replace non permette di inserire o riordinare le
-- colonne di una vista esistente (errore 42P16). Così il file resta
-- rieseguibile anche su un database dove la vista c'è già in versione vecchia.
drop view if exists public.open_requests;
create view public.open_requests as
select
  id,
  host_id,
  driver_id,
  lista_birre,
  null::text as indirizzo,
  round(lat::numeric, 2)::double precision as lat,
  round(lng::numeric, 2)::double precision as lng,
  fascia,
  stato,
  vibe_mode,
  crediti_offerti,
  host_confermato,
  driver_confermato,
  created_at,
  -- updated_at serve all'app: è il campo su cui il server decide se un giro è
  -- "bloccato" da 24 ore (cancel_stale_order). Senza, il client usava created_at
  -- e mostrava il pulsante di sblocco quando il server lo avrebbe rifiutato.
  updated_at,
  citta,
  stato_moderazione
from public.orders
where stato = 'richiesto'
  and stato_moderazione = 'ok'
  and created_at > now() - interval '12 hours'
  and not public.pair_blocked(host_id, auth.uid());

grant select on public.open_requests to authenticated;

-- ============================================================
-- 3. PUSH FIRMATE
-- La edge function send-push gira con "Enforce JWT verification" OFF perché
-- pg_net la chiama senza header di autenticazione: senza un segreto proprio,
-- chiunque conosca l'URL del progetto (che sta dentro l'APK) può mandare
-- notifiche a tutti gli utenti. Il segreto viaggia in un header ad ogni push.
--
-- app_secrets ha RLS attiva e NESSUNA policy: né anon né authenticated possono
-- leggerla. Ci arrivano solo le funzioni SECURITY DEFINER e il SQL Editor.
-- ============================================================
create table if not exists public.app_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Segreto generato dal database stesso: non passa da nessun file del progetto.
-- Rieseguire la migrazione NON lo rigenera (così non si scollega dalla funzione).
insert into public.app_secrets (key, value)
select 'push_shared_secret',
       replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
on conflict (key) do nothing;

create or replace function public.push_to_users(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url    constant text := 'https://kjxahufzseybvxtfsiwu.supabase.co';
  v_secret text;
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return; end if;
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
  exception when others then
    -- Best-effort: nessun flusso applicativo deve fallire perché la push non parte.
    null;
  end;
end; $$;

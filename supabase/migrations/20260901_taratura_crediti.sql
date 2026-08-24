-- BeerToBeer - la distanza conta davvero (01/09/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- SEGNALAZIONE: «rivedere e migliorare il calcolatore delle distanze e peso
-- per i beercoin di una consegna».
--
-- IL DIFETTO
-- Chi si faceva 5 km a piedi con 13 kg di birra guadagnava 2 BeerCoin in piu'
-- di chi attraversava la strada. La distanza - cioe' la fatica vera - valeva
-- mezzo BeerCoin al chilometro, meno di due birre in piu' nella busta.
--
-- E il tetto a 10 tagliava esattamente i giri piu' faticosi: 24 birre a 5 km
-- valevano 11, quindi venivano pagati 10, come un giro medio. Lo sforzo in
-- piu' era gratis.
--
-- LA TARATURA
--   BeerCoin per km:  0.5 -> 1.0   (un chilometro, una moneta: si capisce)
--   tetto:             10 -> 14    (cosi' il giro difficile vale davvero di piu')
--
--                        PRIMA   ORA
--   6 birre,  1 km         4       4     (i giri piccoli non cambiano)
--   12 birre, 3 km         7       8
--   24 birre, 5 km        10      13     (prima 11, tagliato a 10)
--
-- NOTA SULL'ECONOMIA: i BeerCoin non si creano qui. Chi chiede paga, chi porta
-- incassa: e' un trasferimento, non stampa di moneta. Alzare il tetto non
-- gonfia l'economia, ridistribuisce meglio la fatica.
--
-- I VALORI SONO RIPETUTI in lib/credits.ts, perche' l'app deve stimare i
-- BeerCoin mentre si scrive senza chiedere niente alla rete a ogni tasto.
-- Il test lib/__tests__/formula-crediti.test.ts legge QUESTO file e fallisce
-- se i due divergono. L'autorita' e' qui.

-- ============================================================
-- 1. PARTE PESO: il tetto passa da 10 a 14
-- ============================================================
create or replace function public.credits_for_weight(p_lista jsonb)
returns integer language sql immutable as $fn$
  select least(14, ceil(1 + public.order_weight_kg(p_lista) * 0.5))::int;
$fn$;

-- ============================================================
-- 2. BONUS DISTANZA: da 0.5 a 1.0 BeerCoin al km
-- ============================================================
-- Questa funzione e' presa PAROLA PER PAROLA da 20260822_beta_hardening.sql:
-- cambiano solo v_d (0.5 -> 1.0) e il tetto (10 -> 14). Postgres non sa
-- sostituire una riga dentro una funzione, quindi va ridefinita tutta - ed e'
-- il momento in cui e' facilissimo perdere per strada un controllo.
--
-- Riscrivendola a memoria avevo gia' perso la guardia dei 50 km contro il GPS
-- falsificato e il messaggio "non comprare nulla" di quando il giro non e' piu'
-- coperto. Per questo e' stata rigenerata dal testo originale invece che
-- ribattuta, e il test verifica che tutte le protezioni siano ancora presenti.

create or replace function public.accept_order(
  p_order_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_d constant numeric := 1.0;  -- BeerCoin per km driver→consegna (specchio di lib/credits.ts)
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

  v_total := least(14, v_weight + v_bonus, v_capienza);

  update public.orders
    set driver_id = auth.uid(), stato = 'accettato',
        crediti_offerti = v_total, updated_at = now()
    where id = p_order_id;
end; $$;

grant execute on function public.accept_order(uuid, double precision, double precision) to authenticated;

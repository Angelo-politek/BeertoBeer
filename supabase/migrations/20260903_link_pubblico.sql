-- BeerToBeer - far seguire un giro a una persona fidata (03/09/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- SEGNALAZIONI DEL COLLAUDO
--   «Pulsante "condividi stato del giro" insensato, manda un link che non si
--    puo aprire. Se vogliamo tenerlo deve mandare la posizione esatta a una
--    persona fidata altrimenti non ha senso»
--   «Sezione del contatto fidato ok, ma non viene salvato da nessuna parte.
--    Non ha nessun senso tenerlo»
--
-- COSA C'ERA
-- Il pulsante mandava `beertobeer://request/<id>`: un indirizzo che apre
-- l'app. Chi lo riceveva senza app vedeva un link morto, e chi ce l'aveva ma
-- non era ne' chi chiede ne' chi porta veniva respinto dalle regole di
-- accesso. Serviva a niente.
-- Il contatto fidato invece si salvava davvero, in order_trusted_contacts, ma
-- nessuno leggeva quella tabella. Un campo che chiede il numero di una persona
-- cara e poi non lo usa per niente e' peggio che non averlo: promette una
-- protezione che non esiste.
--
-- COSA C'E' ORA
-- Un indirizzo web vero, con un codice impossibile da indovinare, che si apre
-- da qualsiasi telefono anche senza l'app. Scade da solo e si puo' revocare.
--
-- LA REGOLA DI RISERVATEZZA, ed e' la parte che conta:
--   1. l'indirizzo di casa NON compare mai, in nessun caso;
--   2. chi CHIEDE puo' condividere stato e orari, ma NON la posizione di chi
--      porta: quella e' di un'altra persona, e non e' sua da pubblicare a uno
--      sconosciuto;
--   3. chi PORTA puo' condividere la propria posizione, perche' e' la sua.
-- Cosi' la funzione serve davvero a chi la usa per sentirsi piu' sicuro, senza
-- diventare un modo per sorvegliare qualcun altro.

-- ============================================================
-- 1. I LINK
-- ============================================================
create table if not exists public.order_share_links (
  token      text primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

alter table public.order_share_links enable row level security;

-- Ognuno vede e revoca soltanto i link che ha creato lui.
drop policy if exists "share_links_own" on public.order_share_links;
create policy "share_links_own" on public.order_share_links
  for select to authenticated using (created_by = auth.uid());

create index if not exists share_links_giro_idx
  on public.order_share_links (order_id, created_by);

-- ============================================================
-- 2. CREARE E REVOCARE
-- ============================================================
create or replace function public.crea_link_giro(p_order_id uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare
  v public.orders%rowtype;
  v_token text;
begin
  select * into v from public.orders where id = p_order_id;
  if not found then raise exception 'Giro inesistente'; end if;
  if auth.uid() not in (v.host_id, coalesce(v.driver_id, v.host_id)) then
    raise exception 'Azione non consentita';
  end if;

  -- Se un link valido c'e' gia', si restituisce quello: chi lo ha mandato a un
  -- amico non deve ritrovarsi con un indirizzo diverso ogni volta che apre la
  -- schermata, o quello mandato prima smetterebbe di aggiornarsi.
  select token into v_token from public.order_share_links
   where order_id = p_order_id and created_by = auth.uid()
     and revoked_at is null and expires_at > now()
   limit 1;
  if v_token is not null then return v_token; end if;

  -- 32 caratteri esadecimali da due uuid: non si indovina per tentativi.
  v_token := replace(gen_random_uuid()::text, '-', '');

  insert into public.order_share_links (token, order_id, created_by, expires_at)
  values (v_token, p_order_id, auth.uid(), now() + interval '12 hours');

  insert into public.order_safety_events (order_id, actor_id, event_type, metadata)
  values (p_order_id, auth.uid(), 'shared', jsonb_build_object('tipo', 'link_pubblico'));

  return v_token;
end $fn$;

create or replace function public.revoca_link_giro(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.order_share_links
     set revoked_at = now()
   where order_id = p_order_id and created_by = auth.uid() and revoked_at is null;
end $fn$;

-- ============================================================
-- 3. COSA VEDE CHI APRE IL LINK
-- ============================================================
-- La redazione sta QUI e non nella pagina web: se domani la pagina cambia, o
-- se ne scrive un'altra, la regola su cosa e' pubblico resta una sola.
create or replace function public.giro_pubblico(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  l public.order_share_links%rowtype;
  v public.orders%rowtype;
  v_chi_porta text;
  v_chi_chiede text;
  v_condiviso_da text;
  v_pos public.order_presence%rowtype;
  v_posizione jsonb := null;
begin
  select * into l from public.order_share_links where token = p_token;
  if not found then return jsonb_build_object('esito', 'inesistente'); end if;
  if l.revoked_at is not null then return jsonb_build_object('esito', 'revocato'); end if;
  if l.expires_at <= now() then return jsonb_build_object('esito', 'scaduto'); end if;

  select * into v from public.orders where id = l.order_id;
  if not found then return jsonb_build_object('esito', 'inesistente'); end if;

  select nome into v_chi_chiede from public.users where id = v.host_id;
  select nome into v_chi_porta  from public.users where id = v.driver_id;
  select nome into v_condiviso_da from public.users where id = l.created_by;

  -- LA POSIZIONE SOLO SE E' DI CHI HA CONDIVISO.
  -- Chi chiede non puo' pubblicare a uno sconosciuto dove si trova chi porta:
  -- non e' una sua informazione da dare.
  if l.created_by = v.driver_id then
    select * into v_pos from public.order_presence
     where order_id = v.id and user_id = l.created_by;
    if found and v_pos.updated_at > now() - interval '30 minutes' then
      v_posizione := jsonb_build_object(
        'lat', v_pos.lat, 'lng', v_pos.lng, 'aggiornata', v_pos.updated_at
      );
    end if;
  end if;

  return jsonb_build_object(
    'esito', 'ok',
    'stato', v.stato,
    'citta', v.citta,
    'condiviso_da', v_condiviso_da,
    'chi_chiede', v_chi_chiede,
    'chi_porta', v_chi_porta,
    'creato_il', v.created_at,
    'aggiornato_il', v.updated_at,
    'scade_il', l.expires_at,
    'posizione', v_posizione
    -- NIENTE indirizzo, niente coordinate della consegna, niente cognomi,
    -- niente contatti. Se domani serve aggiungere qualcosa, si aggiunge qui e
    -- si ripensa se e' davvero necessario.
  );
end $fn$;

-- ============================================================
-- 4. PERMESSI
-- ============================================================
grant execute on function public.crea_link_giro(uuid) to authenticated;
grant execute on function public.revoca_link_giro(uuid) to authenticated;

-- giro_pubblico la chiama SOLO la pagina web, con la chiave di servizio.
-- Lasciarla aperta agli utenti non sarebbe una falla (serve comunque il
-- codice), ma non c'e' motivo di offrirla.
revoke all on function public.giro_pubblico(text) from public, anon, authenticated;
grant execute on function public.giro_pubblico(text) to service_role;

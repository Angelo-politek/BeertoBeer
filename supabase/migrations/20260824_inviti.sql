-- BeerToBeer — ingresso solo su invito (24/08/2026).
-- Eseguire DOPO 20260823_week3.sql. Sicuro da rieseguire.
--
-- Regole decise per la beta di Torino:
--   * in Beer to Beer si entra SOLO con un invito;
--   * ogni persona ne ha UNO, per sempre: è una scelta, non una risorsa;
--   * l'invito si consuma quando qualcuno lo usa per registrarsi;
--   * gli amministratori ne hanno sempre di disponibili (servono a seminare);
--   * il premio (5 BeerCoin a testa) arriva alla PRIMA CONSEGNA di chi è
--     entrato, non alla registrazione: si premia chi porta persone che
--     contribuiscono davvero, non chi colleziona iscritti.

-- ============================================================
-- 1. TABELLA INVITI
-- ============================================================
create table if not exists public.invites (
  code            text primary key,
  inviter_id      uuid not null references public.users(id) on delete cascade,
  invited_user_id uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  used_at         timestamptz
);

create index if not exists invites_inviter_idx on public.invites (inviter_id);

alter table public.invites enable row level security;

-- Ognuno vede i propri inviti. Nessuna scrittura dal client: creazione e
-- consumo passano solo dalle funzioni qui sotto.
drop policy if exists "invites_select_own" on public.invites;
create policy "invites_select_own"
  on public.invites for select
  using (inviter_id = auth.uid());

-- ============================================================
-- 2. GENERAZIONE DEL CODICE
-- Alfabeto senza caratteri confondibili (niente O/0, I/1/L): un codice va
-- letto ad alta voce o scritto a mano, e "BIRRA-O0" non deve esistere.
-- ============================================================
create or replace function public.gen_invite_code()
returns text language plpgsql as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_try  int := 0;
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
      if i = 4 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.invites where code = v_code);
    v_try := v_try + 1;
    if v_try > 50 then raise exception 'Non riesco a generare un codice invito'; end if;
  end loop;
  return v_code;
end $$;

-- ============================================================
-- 3. DOTAZIONE
-- Utente normale: UNO in tutta la sua vita nell'app.
-- Amministratore: ne ha sempre 10 inutilizzati (di fatto illimitati), perché
-- deve poter seminare la beta e rimediare se qualcuno spreca il suo.
-- ============================================================
create or replace function public.ensure_invites_for(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin    boolean;
  v_totali   int;
  v_liberi   int;
  v_mancanti int;
begin
  select coalesce(is_admin, false) into v_admin from public.users where id = p_user;
  if not found then return; end if;

  select count(*), count(*) filter (where used_at is null)
    into v_totali, v_liberi
    from public.invites where inviter_id = p_user;

  if v_admin then
    v_mancanti := greatest(0, 10 - v_liberi);
  else
    -- uno per sempre: se lo ha già (usato o no) non se ne aggiungono altri
    v_mancanti := greatest(0, 1 - v_totali);
  end if;

  for i in 1..v_mancanti loop
    insert into public.invites (code, inviter_id) values (public.gen_invite_code(), p_user);
  end loop;
end $$;

/** I miei inviti, con lo stato di ciascuno. Crea la dotazione se manca. */
create or replace function public.my_invites()
returns table (code text, usato boolean, invitato text, used_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_invites_for(auth.uid());
  return query
    select i.code, i.used_at is not null, u.nome, i.used_at
    from public.invites i
    left join public.users u on u.id = i.invited_user_id
    where i.inviter_id = auth.uid()
    order by i.used_at nulls first, i.created_at;
end $$;

/**
 * Il codice è valido e libero? Serve alla schermata di registrazione per dare
 * una risposta immediata invece di far scoprire l'errore dopo aver compilato
 * tutto. Chiamabile da chi non è ancora registrato, per forza di cose.
 */
create or replace function public.invite_is_valid(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.invites
    where code = upper(btrim(p_code)) and used_at is null
  );
$$;

grant execute on function public.my_invites() to authenticated;
grant execute on function public.invite_is_valid(text) to anon, authenticated;

-- ============================================================
-- 4. IL CANCELLO — si entra solo con un invito valido
--
-- Il controllo sta qui e non nell'app: il trigger gira alla creazione
-- dell'utente e, se solleva, la registrazione viene annullata per intero.
-- Un'app modificata non può aggirarlo.
--
-- Conserva tutto ciò che faceva prima (10 BeerCoin di benvenuto + riga di
-- ledger): cambia solo che ora prima verifica l'invito.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
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
    10,
    v_inviter
  );

  -- Consuma l'invito: da qui in poi quel posto è speso.
  if v_inviter is not null then
    update public.invites
      set invited_user_id = new.id, used_at = now()
      where code = v_code;
  end if;

  -- Il nuovo arrivato riceve il suo invito da spendere.
  perform public.ensure_invites_for(new.id);

  -- Traccia il benvenuto nel ledger (conio di sistema: from_user_id = null).
  -- Best-effort: se il ledger fallisse, la registrazione NON deve rompersi.
  begin
    insert into public.credit_transactions (from_user_id, to_user_id, importo, tipo)
    values (null, new.id, 10, 'welcome');
  exception when others then
    null;
  end;

  return new;
end;
$$;

-- ============================================================
-- 5. IL PREMIO — alla prima consegna di chi è entrato, non prima
-- ============================================================
create or replace function public.reward_referral_first_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_inviter uuid;
  v_consegne int;
begin
  if new.stato <> 'confermato' or old.stato = 'confermato' or new.driver_id is null then
    return new;
  end if;

  select referred_by into v_inviter from public.users where id = new.driver_id;
  if v_inviter is null then return new; end if;

  -- Questa è appena diventata 'confermato': se il totale è 1, è la prima.
  select count(*) into v_consegne
    from public.orders
    where driver_id = new.driver_id and stato = 'confermato';
  if v_consegne <> 1 then return new; end if;

  perform public.award_tokens(new.driver_id, 5, 'referral', 'primo giro dopo l''invito');
  perform public.award_tokens(v_inviter, 5, 'referral', 'chi hai invitato ha fatto il primo giro');
  perform public.push_to_users(
    array[v_inviter],
    'La tua scelta ha portato bene',
    'Chi hai invitato ha completato il primo giro: +5 BeerCoin per entrambi.',
    '/beercoin'
  );
  return new;
exception when others then
  -- Un premio mancato non deve mai far fallire la chiusura di uno scambio.
  return new;
end $$;

drop trigger if exists on_order_referral_reward on public.orders;
create trigger on_order_referral_reward
  after update on public.orders
  for each row execute function public.reward_referral_first_delivery();

-- ============================================================
-- 6. La vecchia apply_referral non serve più
-- Premiava entrambi SUBITO alla dichiarazione, ed era chiamabile da chiunque:
-- un utente senza referred_by poteva accreditarsi 5 BeerCoin indicando un
-- conoscente. Ora l'invito si registra all'ingresso e il premio arriva alla
-- prima consegna, quindi la si rende innocua invece di lasciarla in giro.
-- ============================================================
create or replace function public.apply_referral(p_inviter uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Volutamente senza effetti: gli inviti si gestiscono alla registrazione.
  return;
end $$;

-- ============================================================
-- 7. Dotazione per chi c'è già (i semi della beta)
-- ============================================================
do $$
declare r record;
begin
  for r in select id from public.users loop
    perform public.ensure_invites_for(r.id);
  end loop;
end $$;

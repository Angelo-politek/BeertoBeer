-- BeerToBeer - incontri, eventi e amici (05/09/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- SEGNALAZIONI DEL COLLAUDO
--   «E' da migliorare il sistema degli incontri ed eventi. Quando creo un
--    incontro o evento devo poter caricare anche una foto (magari la locandina
--    di un evento in un pub) e distinguere tra incontro ed evento. Poi quando
--    gli altri utenti si uniscono devono poter vedere la lista dei partecipanti
--    oltre che dell'organizzatore e magari accedere anche a una chat di gruppo»
--   «Da implementare sistema "amici" con rete di amici, meccanismo con
--    richiesta di amicizia da accettare, chat con gli amici con la cronologia
--    conservata, sezione in cui poter vedere tutti gli amici»
--
-- DECISO INSIEME AD ALESSIO
--   INCONTRO = spontaneo, lo crea chiunque, due birre al parco.
--   EVENTO   = in un locale, con locandina, aperto a piu' gente.
--   AMICI    = solo sociali: non cambiano niente su giri, crediti o visibilita'.
--              Con poche persone in citta', giri riservati agli amici
--              frammenterebbero una beta gia' piccola.

-- ============================================================
-- 1. INCONTRO O EVENTO
-- ============================================================
alter table public.events add column if not exists tipo text not null default 'incontro';
alter table public.events add column if not exists locandina_url text;

alter table public.events drop constraint if exists events_tipo_chk;
alter table public.events add  constraint events_tipo_chk
  check (tipo in ('incontro', 'evento'));

-- ============================================================
-- 2. DOVE FINISCONO LE LOCANDINE
-- ============================================================
-- Bucket pubblico: una locandina e' fatta per essere vista, e serve un
-- indirizzo apribile anche dalla pagina web del link pubblico.
-- Le foto profilo stanno gia' in 'avatars' con lo stesso schema.
insert into storage.buckets (id, name, public)
values ('eventi', 'eventi', true)
on conflict (id) do nothing;

-- Ognuno carica solo dentro una cartella col proprio id: cosi' nessuno puo'
-- sovrascrivere la locandina di un altro.
drop policy if exists "eventi_lettura" on storage.objects;
create policy "eventi_lettura" on storage.objects
  for select using (bucket_id = 'eventi');

drop policy if exists "eventi_scrittura_propria" on storage.objects;
create policy "eventi_scrittura_propria" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'eventi' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eventi_cancellazione_propria" on storage.objects;
create policy "eventi_cancellazione_propria" on storage.objects
  for delete to authenticated
  using (bucket_id = 'eventi' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 3. CHI PARTECIPA SI VEDE
-- ============================================================
-- Prima si vedeva solo il numero e l'organizzatore: «5 / 8 posti» non dice a
-- nessuno con chi si sta per passare la serata.
create or replace function public.partecipanti_evento(p_event_id uuid)
returns table (id uuid, nome text, foto_url text, e_organizzatore boolean)
language sql security definer set search_path = public stable as $fn$
  select u.id, u.nome, u.foto_url, (u.id = e.host_id)
  from public.events e
  join public.users u
    on u.id = e.host_id
    or u.id in (select p.user_id from public.event_participants p where p.event_id = e.id)
  where e.id = p_event_id
  order by (u.id = e.host_id) desc, u.nome;
$fn$;

-- ============================================================
-- 4. LA CHAT DI GRUPPO
-- ============================================================
-- Stessa forma di public.messages: chi partecipa scrive, la cronologia resta.
create table if not exists public.event_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  sender_id  uuid not null references public.users(id) on delete cascade,
  testo      text not null check (char_length(trim(testo)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists event_messages_evento_idx
  on public.event_messages (event_id, created_at);

alter table public.event_messages enable row level security;

-- Chi partecipa (o organizza) legge.
drop policy if exists "event_messages_partecipanti_leggono" on public.event_messages;
create policy "event_messages_partecipanti_leggono" on public.event_messages
  for select to authenticated using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.host_id = auth.uid()
             or exists (select 1 from public.event_participants p
                        where p.event_id = e.id and p.user_id = auth.uid()))
    )
  );

-- Chi partecipa scrive, e solo finche' l'incontro non e' chiuso.
drop policy if exists "event_messages_partecipanti_scrivono" on public.event_messages;
create policy "event_messages_partecipanti_scrivono" on public.event_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and e.stato = 'aperto'
        and (e.host_id = auth.uid()
             or exists (select 1 from public.event_participants p
                        where p.event_id = e.id and p.user_id = auth.uid()))
    )
  );

grant select, insert on public.event_messages to authenticated;

-- ============================================================
-- 5. GLI AMICI
-- ============================================================
create table if not exists public.amicizie (
  id            uuid primary key default gen_random_uuid(),
  richiedente   uuid not null references public.users(id) on delete cascade,
  destinatario  uuid not null references public.users(id) on delete cascade,
  stato         text not null default 'in_attesa'
                check (stato in ('in_attesa', 'accettata', 'rifiutata')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (richiedente <> destinatario),
  unique (richiedente, destinatario)
);

create index if not exists amicizie_destinatario_idx
  on public.amicizie (destinatario, stato);
create index if not exists amicizie_richiedente_idx
  on public.amicizie (richiedente, stato);

alter table public.amicizie enable row level security;

-- Ognuno vede solo le amicizie che lo riguardano.
drop policy if exists "amicizie_mie" on public.amicizie;
create policy "amicizie_mie" on public.amicizie
  for select to authenticated
  using (richiedente = auth.uid() or destinatario = auth.uid());

-- Nessuna scrittura diretta dal client: passa tutto dalle funzioni qui sotto,
-- che sanno controllare i blocchi e mandare gli avvisi.

-- Sono amici? Serve in mezza app, e va detto in un posto solo.
create or replace function public.sono_amici(p_a uuid, p_b uuid)
returns boolean language sql security definer set search_path = public stable as $fn$
  select exists (
    select 1 from public.amicizie
    where stato = 'accettata'
      and ((richiedente = p_a and destinatario = p_b)
        or (richiedente = p_b and destinatario = p_a))
  );
$fn$;

create or replace function public.chiedi_amicizia(p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare v_esistente public.amicizie%rowtype; v_nome text;
begin
  if p_user_id = auth.uid() then raise exception 'Non puoi aggiungere te stesso'; end if;
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Persona inesistente';
  end if;

  -- Chi ha bloccato (o e' stato bloccato) non deve poter ricominciare da qui:
  -- una richiesta di amicizia e' comunque un modo di farsi vivo.
  if public.pair_blocked(auth.uid(), p_user_id) then
    raise exception 'Non puoi mandare una richiesta a questa persona';
  end if;

  select * into v_esistente from public.amicizie
   where (richiedente = auth.uid() and destinatario = p_user_id)
      or (richiedente = p_user_id and destinatario = auth.uid());

  if found then
    if v_esistente.stato = 'accettata' then return 'gia_amici'; end if;
    -- Se l'altro aveva gia' chiesto a me, chiedere io equivale ad accettare.
    if v_esistente.stato = 'in_attesa' and v_esistente.destinatario = auth.uid() then
      update public.amicizie set stato = 'accettata', updated_at = now()
       where id = v_esistente.id;
      select nome into v_nome from public.users where id = auth.uid();
      perform public.avvisa(array[p_user_id], 'event', 'Siete amici',
        coalesce(v_nome, 'Qualcuno') || ' ha accettato la tua richiesta.', '/amici');
      return 'accettata';
    end if;
    if v_esistente.stato = 'in_attesa' then return 'gia_richiesta'; end if;
    -- Rifiutata in passato: si puo' riprovare, ma si riparte da capo.
    update public.amicizie
       set richiedente = auth.uid(), destinatario = p_user_id,
           stato = 'in_attesa', updated_at = now()
     where id = v_esistente.id;
  else
    insert into public.amicizie (richiedente, destinatario)
    values (auth.uid(), p_user_id);
  end if;

  select nome into v_nome from public.users where id = auth.uid();
  perform public.avvisa(array[p_user_id], 'event', 'Richiesta di amicizia',
    coalesce(v_nome, 'Qualcuno') || ' vuole aggiungerti agli amici.', '/amici');
  return 'inviata';
end $fn$;

create or replace function public.rispondi_amicizia(p_id uuid, p_accetta boolean)
returns void language plpgsql security definer set search_path = public as $fn$
declare v public.amicizie%rowtype; v_nome text;
begin
  select * into v from public.amicizie where id = p_id and destinatario = auth.uid();
  if not found then raise exception 'Richiesta non trovata'; end if;

  update public.amicizie
     set stato = case when p_accetta then 'accettata' else 'rifiutata' end,
         updated_at = now()
   where id = p_id;

  -- Solo l'accettazione avvisa. Dire a qualcuno che e' stato rifiutato non
  -- serve a niente e fa solo male.
  if p_accetta then
    select nome into v_nome from public.users where id = auth.uid();
    perform public.avvisa(array[v.richiedente], 'event', 'Siete amici',
      coalesce(v_nome, 'Qualcuno') || ' ha accettato la tua richiesta.', '/amici');
  end if;
end $fn$;

create or replace function public.togli_amicizia(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  delete from public.amicizie
   where (richiedente = auth.uid() and destinatario = p_user_id)
      or (richiedente = p_user_id and destinatario = auth.uid());
end $fn$;

/** I miei amici, piu' le richieste che devo ancora accettare. */
create or replace function public.miei_amici()
returns table (
  id uuid, nome text, foto_url text, citta text,
  relazione text,          -- 'amico' | 'in_arrivo' | 'in_attesa'
  richiesta_id uuid,
  da timestamptz
) language sql security definer set search_path = public stable as $fn$
  select
    case when a.richiedente = auth.uid() then u2.id else u1.id end,
    case when a.richiedente = auth.uid() then u2.nome else u1.nome end,
    case when a.richiedente = auth.uid() then u2.foto_url else u1.foto_url end,
    case when a.richiedente = auth.uid() then u2.citta else u1.citta end,
    case
      when a.stato = 'accettata' then 'amico'
      when a.destinatario = auth.uid() then 'in_arrivo'
      else 'in_attesa'
    end,
    a.id,
    a.updated_at
  from public.amicizie a
  join public.users u1 on u1.id = a.richiedente
  join public.users u2 on u2.id = a.destinatario
  where (a.richiedente = auth.uid() or a.destinatario = auth.uid())
    and a.stato in ('in_attesa', 'accettata')
  order by (case when a.destinatario = auth.uid() and a.stato = 'in_attesa' then 0 else 1 end),
           a.updated_at desc;
$fn$;

/** Che rapporto ho con questa persona: serve al pulsante sul suo profilo. */
create or replace function public.relazione_con(p_user_id uuid)
returns text language sql security definer set search_path = public stable as $fn$
  select coalesce((
    select case
      when a.stato = 'accettata' then 'amico'
      when a.destinatario = auth.uid() then 'in_arrivo'
      else 'in_attesa'
    end
    from public.amicizie a
    where (a.richiedente = auth.uid() and a.destinatario = p_user_id)
       or (a.richiedente = p_user_id and a.destinatario = auth.uid())
    limit 1
  ), 'nessuna');
$fn$;

-- ============================================================
-- 6. IL PROFILO CHE VALE LA PENA APRIRE
-- ============================================================
-- Segnalazione del collaudo: «si potrebbe anche aggiungere una riga che fa
-- vedere chi ha invitato quella persona (linkando il profilo) e altre label
-- personalizzate per founder e amministratori».
--
-- «founder» e' una scelta, non un calcolo: si mette a mano a chi ha fondato il
-- progetto. Dedurlo da «e' fra i primi iscritti» sarebbe sbagliato — i primi
-- iscritti di una beta sono solo i primi arrivati.
--   update public.users set founder = true where email = '...';
alter table public.users add column if not exists founder boolean not null default false;

-- Quello che di una persona si puo' mostrare a chiunque.
-- is_admin sta sulla tabella users ma NON e' leggibile dal client: la riga di
-- un'altra persona non e' selezionabile per intero. Serve una funzione che
-- decida cosa e' pubblico.
create or replace function public.profilo_pubblico_extra(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
declare
  v_admin boolean; v_founder boolean;
  v_invitante_id uuid; v_invitante_nome text;
begin
  select is_admin, founder, referred_by
    into v_admin, v_founder, v_invitante_id
    from public.users where id = p_user_id;
  if not found then raise exception 'Persona inesistente'; end if;

  if v_invitante_id is not null then
    select nome into v_invitante_nome from public.users where id = v_invitante_id;
  end if;

  return jsonb_build_object(
    'is_admin', coalesce(v_admin, false),
    'founder', coalesce(v_founder, false),
    'invitante_id', v_invitante_id,
    'invitante_nome', v_invitante_nome
  );
end $fn$;

-- ============================================================
-- 6. PERMESSI
-- ============================================================
grant execute on function public.partecipanti_evento(uuid) to authenticated;
grant execute on function public.sono_amici(uuid, uuid) to authenticated;
grant execute on function public.chiedi_amicizia(uuid) to authenticated;
grant execute on function public.rispondi_amicizia(uuid, boolean) to authenticated;
grant execute on function public.togli_amicizia(uuid) to authenticated;
grant execute on function public.miei_amici() to authenticated;
grant execute on function public.relazione_con(uuid) to authenticated;
grant execute on function public.profilo_pubblico_extra(uuid) to authenticated;

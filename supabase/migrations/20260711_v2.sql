-- BeerToBeer V2.0: sicurezza del giro, reciprocità e missioni urbane.
-- Eseguire dopo 20260703_gamification.sql. Idempotente.

-- La gamification V1 viene ritirata. Saldi e ledger restano intatti.
delete from public.user_badges;
drop trigger if exists on_order_check_infame on public.orders;
create or replace function public.gamify_on_confirm(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- V2 aggiorna missioni e obiettivi tramite il trigger v2_on_order_confirmed.
  return;
end;
$$;

alter table public.orders drop constraint if exists orders_stato_check;
alter table public.orders drop constraint if exists orders_stato_chk;
alter table public.orders add constraint orders_stato_chk
  check (stato in ('richiesto','accettato','in_consegna','arrivato','consegnato','confermato'));

-- Codice visibile solo all'host. Chi porta può esclusivamente verificarlo via RPC.
create table if not exists public.order_delivery_codes (
  order_id uuid primary key references public.orders(id) on delete cascade,
  host_id uuid not null references public.users(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{6}$'),
  failed_attempts int not null default 0 check (failed_attempts between 0 and 5),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.order_delivery_codes enable row level security;
drop policy if exists "delivery_code_host_read" on public.order_delivery_codes;
create policy "delivery_code_host_read" on public.order_delivery_codes
  for select to authenticated using (host_id = auth.uid());

create or replace function public.v2_create_delivery_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stato = 'accettato' and new.driver_id is not null
     and (old.stato is distinct from new.stato or old.driver_id is distinct from new.driver_id) then
    insert into public.order_delivery_codes(order_id, host_id, code)
    values (new.id, new.host_id, lpad(floor(random() * 1000000)::int::text, 6, '0'))
    on conflict (order_id) do update
      set host_id = excluded.host_id, code = excluded.code, failed_attempts = 0,
          verified_at = null, created_at = now();
  end if;
  return new;
end;
$$;
drop trigger if exists v2_order_delivery_code on public.orders;
create trigger v2_order_delivery_code after update of stato, driver_id on public.orders
for each row execute function public.v2_create_delivery_code();

create table if not exists public.order_safety_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in
    ('accepted','started','arrived','code_failed','code_verified','exited','shared','reported','completed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_safety_events_order_idx
  on public.order_safety_events(order_id, created_at);
alter table public.order_safety_events enable row level security;
drop policy if exists "safety_events_participants_read" on public.order_safety_events;
create policy "safety_events_participants_read" on public.order_safety_events
  for select to authenticated using (exists (
    select 1 from public.orders o where o.id = order_id
      and auth.uid() in (o.host_id, o.driver_id)
  ));

create table if not exists public.order_trusted_contacts (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  contact text not null check (char_length(trim(contact)) between 3 and 160),
  created_at timestamptz not null default now(),
  primary key(order_id, user_id)
);
alter table public.order_trusted_contacts enable row level security;
drop policy if exists "trusted_contact_owner" on public.order_trusted_contacts;
create policy "trusted_contact_owner" on public.order_trusted_contacts
  for all to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid() and exists (
      select 1 from public.orders o where o.id = order_id
        and auth.uid() in (o.host_id, o.driver_id)
    )
  );

create or replace function public.arrive_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Giro inesistente'; end if;
  if v_order.driver_id <> auth.uid() then raise exception 'Azione non consentita'; end if;
  if v_order.stato <> 'in_consegna' then raise exception 'Il giro non è in arrivo'; end if;
  update public.orders set stato = 'arrivato', updated_at = now() where id = p_order_id;
  insert into public.order_safety_events(order_id, actor_id, event_type)
    values (p_order_id, auth.uid(), 'arrived');
end;
$$;

create or replace function public.verify_delivery_code(p_order_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_code public.order_delivery_codes%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Giro inesistente'; end if;
  if v_order.driver_id <> auth.uid() then raise exception 'Azione non consentita'; end if;
  if v_order.stato <> 'arrivato' then raise exception 'Segna prima il tuo arrivo'; end if;
  select * into v_code from public.order_delivery_codes where order_id = p_order_id for update;
  if v_code.verified_at is not null then return; end if;
  if v_code.failed_attempts >= 5 then raise exception 'Troppi tentativi. Contatta l’host'; end if;
  if v_code.code <> trim(p_code) then
    update public.order_delivery_codes set failed_attempts = failed_attempts + 1 where order_id = p_order_id;
    insert into public.order_safety_events(order_id, actor_id, event_type)
      values (p_order_id, auth.uid(), 'code_failed');
    raise exception 'Codice errato';
  end if;
  update public.order_delivery_codes set verified_at = now() where order_id = p_order_id;
  update public.orders set stato = 'consegnato', updated_at = now() where id = p_order_id;
  insert into public.order_safety_events(order_id, actor_id, event_type)
    values (p_order_id, auth.uid(), 'code_verified');
end;
$$;

-- Compatibilità: la vecchia RPC avanza solo fino a "in_consegna".
create or replace function public.advance_order(p_order_id uuid, p_new_stato text)
returns void language plpgsql security definer set search_path = public as $$
declare v_driver uuid; v_stato text;
begin
  select driver_id, stato into v_driver, v_stato from public.orders where id = p_order_id for update;
  if not found then raise exception 'Giro inesistente'; end if;
  if v_driver is null or v_driver <> auth.uid() then raise exception 'Azione non consentita'; end if;
  if not (v_stato = 'accettato' and p_new_stato = 'in_consegna') then raise exception 'Transizione non valida'; end if;
  update public.orders set stato = p_new_stato, updated_at = now() where id = p_order_id;
  insert into public.order_safety_events(order_id, actor_id, event_type)
    values (p_order_id, auth.uid(), 'started');
end;
$$;

-- Missioni urbane: catalogo piccolo, progressi verificati dal server.
create table if not exists public.urban_missions (
  key text primary key,
  title text not null,
  description text not null,
  event_type text not null,
  target int not null check (target > 0),
  reward_beercoin int not null check (reward_beercoin >= 0),
  active boolean not null default true
);
insert into public.urban_missions(key,title,description,event_type,target,reward_beercoin) values
  ('complete_one','Fai la tua parte','Completa un giro questa settimana.','delivery',1,2),
  ('night_route','La città non dorme','Completa un giro dopo le 22.','night_delivery',1,2),
  ('map_shop','Mappa il quartiere','Segnala un negozio che viene approvato.','approved_shop',1,1),
  ('join_meetup','Esci dal feed','Partecipa a un incontro locale.','event_join',1,1),
  ('give_back','Dai e ricevi','Completa un giro portando una birra.','driver_delivery',1,2)
on conflict (key) do update set title=excluded.title, description=excluded.description,
 event_type=excluded.event_type, target=excluded.target, reward_beercoin=excluded.reward_beercoin;
alter table public.urban_missions enable row level security;
drop policy if exists "urban_missions_read" on public.urban_missions;
create policy "urban_missions_read" on public.urban_missions for select to authenticated using (active);

create table if not exists public.user_urban_missions (
  user_id uuid not null references public.users(id) on delete cascade,
  mission_key text not null references public.urban_missions(key),
  week_start date not null,
  progress int not null default 0,
  claimed_at timestamptz,
  primary key(user_id, mission_key, week_start)
);
alter table public.user_urban_missions enable row level security;
drop policy if exists "user_urban_missions_own" on public.user_urban_missions;
create policy "user_urban_missions_own" on public.user_urban_missions
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.city_weekly_goals (
  citta text not null,
  week_start date not null,
  target int not null default 20,
  progress int not null default 0,
  primary key(citta, week_start)
);
alter table public.city_weekly_goals enable row level security;
drop policy if exists "city_goals_read" on public.city_weekly_goals;
create policy "city_goals_read" on public.city_weekly_goals for select to authenticated using (true);

create or replace function public.v2_on_order_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_week date := date_trunc('week', now())::date;
begin
  if new.stato = 'confermato' and old.stato <> 'confermato' then
    insert into public.user_urban_missions(user_id,mission_key,week_start,progress)
      values (new.driver_id,'complete_one',v_week,1), (new.driver_id,'give_back',v_week,1)
      on conflict (user_id,mission_key,week_start) do update
      set progress = public.user_urban_missions.progress + 1;
    if extract(hour from new.updated_at) >= 22 then
      insert into public.user_urban_missions(user_id,mission_key,week_start,progress)
        values (new.driver_id,'night_route',v_week,1)
        on conflict (user_id,mission_key,week_start) do update
        set progress = public.user_urban_missions.progress + 1;
    end if;
    insert into public.city_weekly_goals(citta,week_start,progress)
      values (coalesce(new.citta,'unknown'),v_week,1)
      on conflict (citta,week_start) do update set progress = public.city_weekly_goals.progress + 1;
    insert into public.order_safety_events(order_id, actor_id, event_type)
      values (new.id, auth.uid(), 'completed');
  end if;
  return new;
end;
$$;
drop trigger if exists v2_order_confirmed on public.orders;
create trigger v2_order_confirmed after update of stato on public.orders
for each row execute function public.v2_on_order_confirmed();

create or replace function public.claim_urban_mission(p_mission_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_week date := date_trunc('week', now())::date; v_row public.user_urban_missions%rowtype; v_m public.urban_missions%rowtype;
begin
  select * into v_row from public.user_urban_missions where user_id=auth.uid() and mission_key=p_mission_key and week_start=v_week for update;
  select * into v_m from public.urban_missions where key=p_mission_key and active;
  if v_m.key is null or v_row.progress < v_m.target then raise exception 'Missione non completata'; end if;
  if v_row.claimed_at is not null then return; end if;
  update public.user_urban_missions set claimed_at=now() where user_id=auth.uid() and mission_key=p_mission_key and week_start=v_week;
  perform public.award_tokens(auth.uid(), v_m.reward_beercoin, 'missione_urbana', p_mission_key);
end;
$$;

create or replace function public.get_reciprocity_summary()
returns table(given_count bigint, received_count bigint) language sql security definer set search_path=public as $$
  select
    count(*) filter (where driver_id=auth.uid()) as given_count,
    count(*) filter (where host_id=auth.uid()) as received_count
  from public.orders where stato='confermato' and auth.uid() in (host_id,driver_id);
$$;

grant execute on function public.arrive_order(uuid) to authenticated;
grant execute on function public.verify_delivery_code(uuid,text) to authenticated;
grant execute on function public.claim_urban_mission(text) to authenticated;
grant execute on function public.get_reciprocity_summary() to authenticated;

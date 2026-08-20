-- BeerToBeer V2.1: Live Giro Hub, problemi, ETA e inbox notifiche.
-- Eseguire dopo 20260711_v2.sql.
alter table public.orders add column if not exists eta_minutes int check (eta_minutes between 1 and 180);
alter table public.orders add column if not exists eta_updated_at timestamptz;
alter table public.order_delivery_codes add column if not exists expires_at timestamptz not null default (now() + interval '6 hours');

create table if not exists public.order_issues (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 actor_id uuid not null references public.users(id) on delete cascade,
 issue_type text not null check(issue_type in ('cannot_start','delay','person_absent','request_mismatch','unsafe')),
 details text check(char_length(details)<=1000), status text not null default 'open' check(status in ('open','resolved','escalated')),
 created_at timestamptz not null default now(), resolved_at timestamptz
);
alter table public.order_issues enable row level security;
drop policy if exists "order_issues_participants" on public.order_issues;
create policy "order_issues_participants" on public.order_issues for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and auth.uid() in(o.host_id,o.driver_id)));

create or replace function public.set_order_eta(p_order_id uuid,p_minutes int) returns void language plpgsql security definer set search_path=public as $$
declare v public.orders%rowtype; begin
 if p_minutes not in (10,20,30,45,60) then raise exception 'ETA non valida'; end if;
 select * into v from public.orders where id=p_order_id for update;
 if v.driver_id<>auth.uid() or v.stato not in('accettato','in_consegna') then raise exception 'Azione non consentita'; end if;
 update public.orders set eta_minutes=p_minutes,eta_updated_at=now() where id=p_order_id;
 insert into public.order_safety_events(order_id,actor_id,event_type,metadata) values(p_order_id,auth.uid(),'started',jsonb_build_object('eta_minutes',p_minutes));
end $$;

create or replace function public.report_order_issue(p_order_id uuid,p_type text,p_details text default '') returns void language plpgsql security definer set search_path=public as $$
declare v public.orders%rowtype; begin
 if p_type not in('cannot_start','delay','person_absent','request_mismatch','unsafe') then raise exception 'Motivo non valido'; end if;
 select * into v from public.orders where id=p_order_id for update;
 if auth.uid() not in(v.host_id,v.driver_id) then raise exception 'Azione non consentita'; end if;
 insert into public.order_issues(order_id,actor_id,issue_type,details) values(p_order_id,auth.uid(),p_type,nullif(trim(p_details),''));
 insert into public.order_safety_events(order_id,actor_id,event_type,metadata) values(p_order_id,auth.uid(),'reported',jsonb_build_object('type',p_type));
end $$;

create or replace function public.regenerate_delivery_code(p_order_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v public.orders%rowtype; begin
 select * into v from public.orders where id=p_order_id for update;
 if v.host_id<>auth.uid() or v.stato not in('accettato','in_consegna','arrivato') then raise exception 'Azione non consentita'; end if;
 update public.order_delivery_codes set code=lpad(floor(random()*1000000)::int::text,6,'0'),failed_attempts=0,verified_at=null,expires_at=now()+interval '6 hours' where order_id=p_order_id;
end $$;

create table if not exists public.notification_inbox (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 dedupe_key text, category text not null check(category in('order','chat','event','mission','safety')),
 title text not null,body text not null,url text,read_at timestamptz,created_at timestamptz not null default now(),unique(user_id,dedupe_key)
);
alter table public.notification_inbox enable row level security;
drop policy if exists "notification_own_read" on public.notification_inbox;
create policy "notification_own_read" on public.notification_inbox for select to authenticated using(user_id=auth.uid());
drop policy if exists "notification_own_update" on public.notification_inbox;
create policy "notification_own_update" on public.notification_inbox for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant execute on function public.set_order_eta(uuid,int) to authenticated;
grant execute on function public.report_order_issue(uuid,text,text) to authenticated;
grant execute on function public.regenerate_delivery_code(uuid) to authenticated;

create or replace function public.auto_credit_urban_mission() returns trigger language plpgsql security definer set search_path=public as $$
declare m public.urban_missions%rowtype; begin
 select * into m from public.urban_missions where key=new.mission_key and active;
 if m.key is not null and new.progress>=m.target and new.claimed_at is null then
  update public.user_urban_missions set claimed_at=now() where user_id=new.user_id and mission_key=new.mission_key and week_start=new.week_start and claimed_at is null;
  perform public.award_tokens(new.user_id,m.reward_beercoin,'missione_urbana',new.mission_key);
 end if; return new;
end $$;
drop trigger if exists v21_auto_credit_mission on public.user_urban_missions;
create trigger v21_auto_credit_mission after insert or update of progress on public.user_urban_missions for each row execute function public.auto_credit_urban_mission();

create table if not exists public.event_waitlist(event_id uuid not null references public.events(id) on delete cascade,user_id uuid not null references public.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(event_id,user_id));
alter table public.event_waitlist enable row level security;
drop policy if exists "event_waitlist_own" on public.event_waitlist;
create policy "event_waitlist_own" on public.event_waitlist for select to authenticated using(user_id=auth.uid());

create or replace function public.join_event_v21(p_event_id uuid) returns text language plpgsql security definer set search_path=public as $$
declare e public.events%rowtype; n int; begin
 select * into e from public.events where id=p_event_id for update;
 if not found or e.stato<>'aperto' or e.quando<=now() then raise exception 'Incontro non disponibile'; end if;
 if e.host_id=auth.uid() then return 'host'; end if;
 if exists(select 1 from public.event_participants where event_id=p_event_id and user_id=auth.uid()) then return 'joined'; end if;
 select count(*) into n from public.event_participants where event_id=p_event_id;
 if n<e.posti then insert into public.event_participants(event_id,user_id) values(p_event_id,auth.uid()) on conflict do nothing; delete from public.event_waitlist where event_id=p_event_id and user_id=auth.uid(); return 'joined'; end if;
 insert into public.event_waitlist(event_id,user_id) values(p_event_id,auth.uid()) on conflict do nothing; return 'waitlisted';
end $$;
create or replace function public.leave_event_v21(p_event_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare promoted uuid; begin
 perform 1 from public.events where id=p_event_id for update;
 delete from public.event_participants where event_id=p_event_id and user_id=auth.uid(); delete from public.event_waitlist where event_id=p_event_id and user_id=auth.uid();
 select user_id into promoted from public.event_waitlist where event_id=p_event_id order by created_at for update skip locked limit 1;
 if promoted is not null then delete from public.event_waitlist where event_id=p_event_id and user_id=promoted; insert into public.event_participants(event_id,user_id) values(p_event_id,promoted) on conflict do nothing; end if;
end $$;
grant execute on function public.join_event_v21(uuid) to authenticated;
grant execute on function public.leave_event_v21(uuid) to authenticated;

alter table public.reviews add column if not exists puntualita int check(puntualita between 1 and 5);
alter table public.reviews add column if not exists comunicazione int check(comunicazione between 1 and 5);
alter table public.reviews add column if not exists rispetto int check(rispetto between 1 and 5);
create or replace function public.submit_review_v21(p_order_id uuid,p_voto int,p_commento text,p_puntualita int,p_comunicazione int,p_rispetto int) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_puntualita not between 1 and 5 or p_comunicazione not between 1 and 5 or p_rispetto not between 1 and 5 then raise exception 'Valutazione non valida'; end if;
 perform public.submit_review(p_order_id,p_voto,p_commento);
 update public.reviews set puntualita=p_puntualita,comunicazione=p_comunicazione,rispetto=p_rispetto where order_id=p_order_id and from_user_id=auth.uid();
end $$;
grant execute on function public.submit_review_v21(uuid,int,text,int,int,int) to authenticated;

alter table public.orders drop constraint if exists orders_stato_chk;
alter table public.orders add constraint orders_stato_chk check(stato in('richiesto','accettato','in_consegna','arrivato','consegnato','confermato','annullato'));
create table if not exists public.admin_audit(id uuid primary key default gen_random_uuid(),admin_id uuid not null references public.users(id),action text not null,target_type text not null,target_id uuid,reason text,created_at timestamptz not null default now());
alter table public.admin_audit enable row level security;
create table if not exists public.product_feedback(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id) on delete cascade,kind text not null check(kind in('bug','idea')),message text not null check(char_length(trim(message)) between 5 and 4000),app_version text,created_at timestamptz not null default now());
alter table public.product_feedback enable row level security;
drop policy if exists "feedback_insert_own" on public.product_feedback;
create policy "feedback_insert_own" on public.product_feedback for insert to authenticated with check(user_id=auth.uid());
create or replace function public.is_admin_user() returns boolean language sql security definer set search_path=public stable as $$select exists(select 1 from public.users where id=auth.uid() and is_admin)$$;
create or replace function public.admin_product_feedback() returns table(id uuid,user_id uuid,user_name text,kind text,message text,app_version text,created_at timestamptz) language plpgsql security definer set search_path=public as $$begin if not public.is_admin_user() then raise exception 'Accesso negato'; end if; return query select f.id,f.user_id,u.nome,f.kind,f.message,f.app_version,f.created_at from public.product_feedback f join public.users u on u.id=f.user_id order by f.created_at desc; end$$;
create or replace function public.admin_cancel_order(p_order_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$begin if not public.is_admin_user() then raise exception 'Accesso negato'; end if; update public.orders set stato='annullato',updated_at=now() where id=p_order_id and stato<>'confermato'; insert into public.admin_audit(admin_id,action,target_type,target_id,reason) values(auth.uid(),'cancel_order','order',p_order_id,p_reason); end$$;
create or replace function public.cancel_stale_order(p_order_id uuid) returns void language plpgsql security definer set search_path=public as $$declare o public.orders%rowtype;begin select * into o from public.orders where id=p_order_id for update; if auth.uid() not in(o.host_id,o.driver_id) then raise exception 'Accesso negato'; end if; if o.stato in('confermato','annullato') then return; end if; if o.updated_at>now()-interval '24 hours' then raise exception 'Il giro non è ancora considerato bloccato'; end if; update public.orders set stato='annullato',updated_at=now() where id=p_order_id; insert into public.order_safety_events(order_id,actor_id,event_type,metadata) values(p_order_id,auth.uid(),'exited',jsonb_build_object('reason','stale')); end$$;
grant execute on function public.admin_product_feedback() to authenticated;
grant execute on function public.admin_cancel_order(uuid,text) to authenticated;
grant execute on function public.cancel_stale_order(uuid) to authenticated;
create or replace function public.admin_active_orders() returns table(id uuid,host_name text,driver_name text,lat double precision,lng double precision,stato text,updated_at timestamptz) language plpgsql security definer set search_path=public as $$begin if not public.is_admin_user() then raise exception 'Accesso negato';end if;insert into public.admin_audit(admin_id,action,target_type,reason)values(auth.uid(),'view_safety_map','system','Accesso alla mappa incidenti attivi');return query select o.id,h.nome,d.nome,o.lat,o.lng,o.stato,o.updated_at from public.orders o join public.users h on h.id=o.host_id left join public.users d on d.id=o.driver_id where o.stato in('accettato','in_consegna','arrivato','consegnato') and o.lat is not null and o.lng is not null;end$$;
grant execute on function public.admin_active_orders() to authenticated;

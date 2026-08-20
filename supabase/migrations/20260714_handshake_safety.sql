-- V2.2: presenza foreground, conferma rapida e uscita sicura dal giro.
alter table public.order_delivery_codes drop constraint if exists order_delivery_codes_code_check;
update public.order_delivery_codes set code=lpad(floor(random()*1000)::int::text,3,'0'),failed_attempts=0,verified_at=null;
alter table public.order_delivery_codes add constraint order_delivery_codes_code_check check (code ~ '^[0-9]{3}$');

alter table public.order_safety_events drop constraint if exists order_safety_events_event_type_check;
alter table public.order_safety_events add constraint order_safety_events_event_type_check check (event_type in
 ('accepted','started','arrived','code_failed','code_verified','exited','shared','reported','completed','presence_confirmed','released','cancelled'));

create table if not exists public.order_presence (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  lat double precision not null, lng double precision not null,
  accuracy_m double precision, confirm_requested boolean not null default false,
  updated_at timestamptz not null default now(), primary key(order_id,user_id)
);
alter table public.order_presence enable row level security;
grant select,insert,update on public.order_presence to authenticated;
drop policy if exists order_presence_own on public.order_presence;
create policy order_presence_own on public.order_presence for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.orders o where o.id=order_id and auth.uid() in(o.host_id,o.driver_id)));

create or replace function public.v2_create_delivery_code() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.stato='accettato' and new.driver_id is not null and (old.stato is distinct from new.stato or old.driver_id is distinct from new.driver_id) then
  insert into order_delivery_codes(order_id,host_id,code) values(new.id,new.host_id,lpad(floor(random()*1000)::int::text,3,'0'))
  on conflict(order_id) do update set host_id=excluded.host_id,code=excluded.code,failed_attempts=0,verified_at=null,created_at=now();
 end if; return new;
end$$;

create or replace function public.regenerate_delivery_code(p_order_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare o orders%rowtype;begin
 select * into o from orders where id=p_order_id for update;
 if o.host_id<>auth.uid() or o.stato not in('accettato','in_consegna','arrivato') then raise exception 'Azione non consentita';end if;
 update order_delivery_codes set code=lpad(floor(random()*1000)::int::text,3,'0'),failed_attempts=0,verified_at=null,expires_at=now()+interval '6 hours' where order_id=p_order_id;
end$$;

create or replace function public.update_order_presence(p_order_id uuid,p_lat double precision,p_lng double precision,p_accuracy_m double precision default null) returns void
language plpgsql security definer set search_path=public as $$ declare o orders%rowtype; begin
 select * into o from orders where id=p_order_id;
 if auth.uid() not in(o.host_id,o.driver_id) or o.stato not in('accettato','in_consegna','arrivato','consegnato') then raise exception 'Presenza non consentita'; end if;
 if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Posizione non valida'; end if;
 insert into order_presence(order_id,user_id,lat,lng,accuracy_m,updated_at) values(p_order_id,auth.uid(),p_lat,p_lng,p_accuracy_m,now())
 on conflict(order_id,user_id) do update set lat=excluded.lat,lng=excluded.lng,accuracy_m=excluded.accuracy_m,updated_at=now();
end$$;

create or replace function public.release_accepted_order(p_order_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare o orders%rowtype; begin
 select * into o from orders where id=p_order_id for update;
 if o.driver_id<>auth.uid() or o.stato<>'accettato' then raise exception 'Il giro non può essere liberato'; end if;
 update orders set driver_id=null,stato='richiesto',host_confermato=false,driver_confermato=false,eta_minutes=null,updated_at=now() where id=p_order_id;
 delete from order_delivery_codes where order_id=p_order_id; delete from order_presence where order_id=p_order_id;
 insert into order_safety_events(order_id,actor_id,event_type,metadata) values(p_order_id,auth.uid(),'released','{}');
end$$;

create or replace function public.cancel_active_order(p_order_id uuid,p_reason text,p_details text default '') returns void language plpgsql security definer set search_path=public as $$ declare o orders%rowtype; begin
 select * into o from orders where id=p_order_id for update;
 if auth.uid() not in(o.host_id,o.driver_id) or o.stato not in('in_consegna','arrivato') then raise exception 'Annullamento non consentito'; end if;
 if p_reason not in('emergenza','guasto','incidente','non_sicuro','richiesta_non_conforme','altro_serio') then raise exception 'Scegli un motivo serio'; end if;
 if p_reason='altro_serio' and char_length(trim(p_details))<10 then raise exception 'Descrivi brevemente il problema'; end if;
 update orders set stato='annullato',updated_at=now() where id=p_order_id;
 insert into order_safety_events(order_id,actor_id,event_type,metadata) values(p_order_id,auth.uid(),'cancelled',jsonb_build_object('reason',p_reason,'details',left(trim(p_details),500)));
end$$;

create or replace function public.confirm_exchange_nearby(p_order_id uuid,p_lat double precision,p_lng double precision,p_accuracy_m double precision default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare o orders%rowtype; mine order_presence%rowtype; other order_presence%rowtype; other_id uuid; distance_m numeric; begin
 select * into o from orders where id=p_order_id for update;
 if auth.uid() not in(o.host_id,o.driver_id) or o.stato not in('arrivato','consegnato') then raise exception 'Conferma non disponibile'; end if;
 perform update_order_presence(p_order_id,p_lat,p_lng,p_accuracy_m);
 update order_presence set confirm_requested=true,updated_at=now() where order_id=p_order_id and user_id=auth.uid();
 other_id:=case when auth.uid()=o.host_id then o.driver_id else o.host_id end;
 select * into mine from order_presence where order_id=p_order_id and user_id=auth.uid();
 select * into other from order_presence where order_id=p_order_id and user_id=other_id;
 if other.user_id is null or not other.confirm_requested or other.updated_at<now()-interval '5 minutes' then return jsonb_build_object('status','waiting'); end if;
 if coalesce(mine.accuracy_m,999)>120 or coalesce(other.accuracy_m,999)>120 then return jsonb_build_object('status','code_required'); end if;
 distance_m:=public.haversine_km(mine.lat,mine.lng,other.lat,other.lng)*1000;
 if distance_m>180 then return jsonb_build_object('status','too_far','distance_m',round(distance_m)); end if;
 if (select crediti_saldo from users where id=o.host_id)<o.crediti_offerti then raise exception 'BeerCoin insufficienti'; end if;
 update orders set host_confermato=true,driver_confermato=true,stato='confermato',updated_at=now() where id=p_order_id;
 update users set crediti_saldo=crediti_saldo-o.crediti_offerti where id=o.host_id;
 update users set crediti_saldo=crediti_saldo+o.crediti_offerti where id=o.driver_id;
 insert into credit_transactions(order_id,from_user_id,to_user_id,importo,tipo) values(p_order_id,o.host_id,o.driver_id,o.crediti_offerti,'consegna') on conflict do nothing;
 insert into order_safety_events(order_id,actor_id,event_type,metadata) values(p_order_id,auth.uid(),'presence_confirmed',jsonb_build_object('distance_m',round(distance_m)));
 return jsonb_build_object('status','completed','distance_m',round(distance_m));
end$$;

create or replace function public.verify_delivery_code(p_order_id uuid,p_code text) returns void language plpgsql security definer set search_path=public as $$ declare o orders%rowtype;c order_delivery_codes%rowtype;begin
 select * into o from orders where id=p_order_id for update;if o.driver_id<>auth.uid() or o.stato not in('arrivato','consegnato') then raise exception 'Azione non consentita';end if;
 select * into c from order_delivery_codes where order_id=p_order_id for update;if c.failed_attempts>=5 then raise exception 'Troppi tentativi';end if;
 if c.code<>trim(p_code) then update order_delivery_codes set failed_attempts=failed_attempts+1 where order_id=p_order_id;insert into order_safety_events(order_id,actor_id,event_type)values(p_order_id,auth.uid(),'code_failed');raise exception 'Codice errato';end if;
 if (select crediti_saldo from users where id=o.host_id)<o.crediti_offerti then raise exception 'BeerCoin insufficienti';end if;
 update order_delivery_codes set verified_at=now() where order_id=p_order_id;
 update orders set stato='confermato',host_confermato=true,driver_confermato=true,updated_at=now() where id=p_order_id;
 update users set crediti_saldo=crediti_saldo-o.crediti_offerti where id=o.host_id;update users set crediti_saldo=crediti_saldo+o.crediti_offerti where id=o.driver_id;
 insert into credit_transactions(order_id,from_user_id,to_user_id,importo,tipo)values(p_order_id,o.host_id,o.driver_id,o.crediti_offerti,'consegna') on conflict do nothing;
 insert into order_safety_events(order_id,actor_id,event_type)values(p_order_id,auth.uid(),'code_verified');
end$$;

drop function if exists public.admin_active_orders();
create function public.admin_active_orders() returns table(id uuid,host_id uuid,host_name text,driver_id uuid,driver_name text,driver_photo text,lat double precision,lng double precision,driver_lat double precision,driver_lng double precision,last_seen timestamptz,stato text,updated_at timestamptz)
language plpgsql security definer set search_path=public as $$begin
 if not public.is_admin_user() then raise exception 'Accesso negato';end if;
 insert into admin_audit(admin_id,action,target_type,reason)values(auth.uid(),'view_safety_map','system','Monitoraggio giri attivi');
 return query select o.id,o.host_id,h.nome,o.driver_id,d.nome,d.foto_url,round(o.lat::numeric,3)::float8,round(o.lng::numeric,3)::float8,round(p.lat::numeric,3)::float8,round(p.lng::numeric,3)::float8,p.updated_at,o.stato,o.updated_at
 from orders o join users h on h.id=o.host_id left join users d on d.id=o.driver_id left join order_presence p on p.order_id=o.id and p.user_id=o.driver_id
 where o.stato in('accettato','in_consegna','arrivato','consegnato') and o.lat is not null and o.lng is not null;
end$$;
grant execute on function public.update_order_presence(uuid,double precision,double precision,double precision) to authenticated;
grant execute on function public.release_accepted_order(uuid) to authenticated;
grant execute on function public.cancel_active_order(uuid,text,text) to authenticated;
grant execute on function public.confirm_exchange_nearby(uuid,double precision,double precision,double precision) to authenticated;
grant execute on function public.admin_active_orders() to authenticated;

-- BeerToBeer V2.1 - profilo personale, galleria e sticker brand
alter table public.users add column if not exists status_phrase text;
alter table public.users add column if not exists beer_tastes text[] not null default '{}';
alter table public.users add column if not exists availability text[] not null default '{}';
alter table public.users add column if not exists photo_visibility text not null default 'tutti';

do $$ begin
  alter table public.users add constraint users_status_phrase_length check (char_length(status_phrase) <= 60);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.users add constraint users_photo_visibility_check check (photo_visibility in ('tutti','connessioni','nascoste'));
exception when duplicate_object then null; end $$;

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  url text not null, storage_path text not null, position smallint not null check (position between 0 and 3),
  created_at timestamptz not null default now(), unique(user_id, position)
);
alter table public.profile_photos enable row level security;
drop policy if exists profile_photos_owner_all on public.profile_photos;
create policy profile_photos_owner_all on public.profile_photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.profile_stickers (
  key text primary key, title text not null, asset_key text not null, description text not null,
  unlock_kind text not null default 'starter', unlock_hint text, sort_order int not null default 0
);
create table if not exists public.user_profile_stickers (
  user_id uuid not null references public.users(id) on delete cascade,
  sticker_key text not null references public.profile_stickers(key) on delete cascade,
  unlocked_at timestamptz not null default now(), source text not null default 'starter', primary key(user_id, sticker_key)
);
create table if not exists public.profile_sticker_layout (
  user_id uuid not null references public.users(id) on delete cascade,
  sticker_key text not null references public.profile_stickers(key) on delete cascade,
  slot smallint not null check (slot between 0 and 2), scale numeric not null default 1 check (scale between .75 and 1.25),
  rotation smallint not null default 0 check (rotation between -12 and 12), primary key(user_id, sticker_key), unique(user_id, slot)
);
alter table public.user_profile_stickers enable row level security;
alter table public.profile_sticker_layout enable row level security;
grant select,insert,update,delete on public.profile_photos to authenticated;
grant select on public.profile_stickers to authenticated;
grant select on public.user_profile_stickers to authenticated;
grant select on public.profile_sticker_layout to authenticated;
drop policy if exists user_stickers_read on public.user_profile_stickers;
create policy user_stickers_read on public.user_profile_stickers for select using (auth.role() = 'authenticated');
drop policy if exists sticker_layout_read on public.profile_sticker_layout;
create policy sticker_layout_read on public.profile_sticker_layout for select using (auth.role() = 'authenticated');

insert into public.profile_stickers(key,title,asset_key,description,unlock_kind,unlock_hint,sort_order) values
('b2b','BeerToBeer','sticker-b2b','Il segno della community.','starter',null,10),
('bottle','Bottiglia','sticker-bottle','Una birra, da persona a persona.','starter',null,20),
('vibe','Vibe','sticker-vibe','Per chi vive la parte sociale con rispetto.','starter',null,30),
('open_source','Open source','open-source','Costruito in modo aperto.','starter',null,40),
('no_profit','No profit','no-profit','La community prima del profitto.','starter',null,50),
('on_the_road','In strada','sticker-moped','Hai portato a termine il tuo primo giro.','first_delivery','Completa un giro come chi porta.',60),
('safe_spot','Safe Spot','icon-pin','Hai contribuito con un luogo approvato.','approved_shop','Fai approvare un nuovo Safe Spot.',70),
('together','Al tavolo','icon-cheers','Hai partecipato a un incontro.','event_join','Partecipa a un incontro.',80),
('reliable','Affidabile','icon-star','Cinque giri conclusi senza problemi.','reliable_five','Concludi 5 giri.',90)
on conflict (key) do update set title=excluded.title, asset_key=excluded.asset_key, description=excluded.description, unlock_kind=excluded.unlock_kind, unlock_hint=excluded.unlock_hint, sort_order=excluded.sort_order;

create or replace function public.refresh_profile_stickers(p_user_id uuid default auth.uid()) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() <> p_user_id and not coalesce((select is_admin from users where id=auth.uid()),false) then raise exception 'Non autorizzato'; end if;
  insert into user_profile_stickers(user_id,sticker_key,source) select p_user_id,key,'starter' from profile_stickers where unlock_kind='starter' on conflict do nothing;
  if exists(select 1 from orders where driver_id=p_user_id and stato='confermato') then insert into user_profile_stickers values(p_user_id,'on_the_road',now(),'first_delivery') on conflict do nothing; end if;
  if exists(select 1 from shops where created_by=p_user_id and stato='approvato') then insert into user_profile_stickers values(p_user_id,'safe_spot',now(),'approved_shop') on conflict do nothing; end if;
  if exists(select 1 from event_participants where user_id=p_user_id) then insert into user_profile_stickers values(p_user_id,'together',now(),'event_join') on conflict do nothing; end if;
  if (select count(*) from orders where stato='confermato' and (host_id=p_user_id or driver_id=p_user_id)) >= 5 then insert into user_profile_stickers values(p_user_id,'reliable',now(),'reliable_five') on conflict do nothing; end if;
end $$;

create or replace function public.get_profile_customization(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u users%rowtype; can_see boolean; result jsonb;
begin
  select * into u from users where id=p_user_id; if not found then return '{}'::jsonb; end if;
  if auth.uid()=p_user_id then perform refresh_profile_stickers(p_user_id); end if;
  can_see := u.photo_visibility='tutti' or auth.uid()=p_user_id or (u.photo_visibility='connessioni' and exists(select 1 from orders where stato='confermato' and ((host_id=auth.uid() and driver_id=p_user_id) or (driver_id=auth.uid() and host_id=p_user_id))));
  select jsonb_build_object('user_id',p_user_id,'status_phrase',coalesce(u.status_phrase,''),'beer_tastes',u.beer_tastes,'availability',u.availability,'photo_visibility',u.photo_visibility,
    'photos',case when can_see then coalesce((select jsonb_agg(jsonb_build_object('id',id,'url',url,'storage_path',storage_path,'position',position) order by position) from profile_photos where user_id=p_user_id),'[]'::jsonb) else '[]'::jsonb end,
    'stickers',coalesce((select jsonb_agg(jsonb_build_object('key',s.key,'title',s.title,'asset_key',s.asset_key,'description',s.description,'unlock_hint',s.unlock_hint,'unlocked',ups.user_id is not null,'slot',l.slot,'scale',l.scale,'rotation',l.rotation) order by s.sort_order) from profile_stickers s left join user_profile_stickers ups on ups.sticker_key=s.key and ups.user_id=p_user_id left join profile_sticker_layout l on l.sticker_key=s.key and l.user_id=p_user_id),'[]'::jsonb)) into result;
  return result;
end $$;

create or replace function public.set_profile_customization(p_status_phrase text,p_beer_tastes text[],p_availability text[],p_photo_visibility text,p_stickers jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare item jsonb;
begin
  if char_length(coalesce(p_status_phrase,''))>60 or p_photo_visibility not in ('tutti','connessioni','nascoste') then raise exception 'Dati profilo non validi'; end if;
  update users set status_phrase=nullif(trim(p_status_phrase),''),beer_tastes=coalesce(p_beer_tastes,'{}'),availability=coalesce(p_availability,'{}'),photo_visibility=p_photo_visibility where id=auth.uid();
  delete from profile_sticker_layout where user_id=auth.uid();
  for item in select value from jsonb_array_elements(coalesce(p_stickers,'[]')) loop
    if not exists(select 1 from user_profile_stickers where user_id=auth.uid() and sticker_key=item->>'key') then raise exception 'Sticker non sbloccato'; end if;
    insert into profile_sticker_layout(user_id,sticker_key,slot,scale,rotation) values(auth.uid(),item->>'key',(item->>'slot')::smallint,coalesce((item->>'scale')::numeric,1),coalesce((item->>'rotation')::smallint,0));
  end loop;
end $$;
grant execute on function public.get_profile_customization(uuid) to authenticated;
grant execute on function public.set_profile_customization(text,text[],text[],text,jsonb) to authenticated;

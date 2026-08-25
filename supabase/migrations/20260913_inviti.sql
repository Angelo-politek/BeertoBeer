-- ============================================================
-- GLI INVITI: UN NOME SOPRA, E QUALCUNO CHE PUO' FARNE ALTRI
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- ============================================================
--
-- L'invito e' la cosa piu' preziosa dell'app: e' l'unico modo di entrare, e
-- ognuno ne ha uno solo. Ma finora era un codice e basta — otto caratteri in
-- mezzo a un messaggio, senza un nome sopra e senza nessuno che potesse
-- correggere un errore.
--
-- Due cose cambiano.
--
-- IL NOME. Chi da' un invito puo' scrivere a chi lo sta dando. Non e' un
-- abbellimento: la schermata dice «ho scelto te», e finora era una frase che
-- il messaggio non manteneva — arrivava un blocco di testo anonimo, che su
-- WhatsApp somiglia a una catena di Sant'Antonio. E soprattutto, scrivere un
-- nome fa fermare a pensare chi sta per spendere l'unico invito che ha, che e'
-- il senso di tutta la schermata.
--
-- L'AMMINISTRAZIONE. Durante una beta servono inviti in piu' — per seminare un
-- quartiere, per sostituire un codice finito a una persona sbagliata, per
-- rimediare a un errore. Finora non c'era modo: `ensure_invites_for` ne dava
-- uno a tutti e dieci agli admin, e quello era.
--
-- Un invito revocato NON si cancella: si marca. Cosi' chi prova a usarlo legge
-- che e' stato ritirato invece di «codice inesistente», che sembra un errore
-- di battitura e fa riprovare tre volte.


-- ============================================================
-- 1. LE DUE COLONNE
-- ============================================================
alter table public.invites add column if not exists nominativo text;
alter table public.invites add column if not exists revocato_il timestamptz;
alter table public.invites add column if not exists creato_da_admin boolean not null default false;

alter table public.invites drop constraint if exists invites_nominativo_chk;
alter table public.invites add constraint invites_nominativo_chk
  check (nominativo is null or char_length(trim(nominativo)) between 1 and 40);


-- ============================================================
-- 2. IL NOME SI PUO' SCRIVERE E CANCELLARE
-- ============================================================
-- Solo sul proprio invito, e solo finche' non e' stato usato: dopo, quel nome
-- e' un pezzo di storia e non si riscrive.
create or replace function public.nomina_invito(p_code text, p_nominativo text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.invites
     set nominativo = nullif(trim(coalesce(p_nominativo, '')), '')
   where code = p_code
     and inviter_id = auth.uid()
     and used_at is null
     and revocato_il is null;
  if not found then
    raise exception 'Questo invito non è tuo, oppure è già stato usato.';
  end if;
end $fn$;

grant execute on function public.nomina_invito(text, text) to authenticated;


-- ============================================================
-- 3. UN AMMINISTRATORE PUO' CREARNE E RITIRARNE
-- ============================================================
create or replace function public.admin_crea_invito(
  p_per uuid default null,
  p_nominativo text default null
) returns text language plpgsql security definer set search_path = public as $fn$
declare
  v_code text;
  v_dest uuid;
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;

  -- Senza destinatario, l'invito e' dell'amministratore che lo crea.
  v_dest := coalesce(p_per, auth.uid());
  if not exists (select 1 from public.users where id = v_dest) then
    raise exception 'Persona inesistente';
  end if;

  -- `gen_invite_code` genera un codice con l'alfabeto senza caratteri
  -- ambigui (niente 0/O, niente 1/I): un codice si detta a voce, e «zero o
  -- o?» e' il modo piu' rapido per far rinunciare qualcuno.
  v_code := public.gen_invite_code();

  insert into public.invites (code, inviter_id, nominativo, creato_da_admin)
  values (v_code, v_dest,
          nullif(trim(coalesce(p_nominativo, '')), ''), true);

  insert into public.admin_audit(admin_id, action, target_type, target_id, reason)
  values (auth.uid(), 'crea_invito', 'user', v_dest,
          coalesce(nullif(trim(coalesce(p_nominativo, '')), ''), 'senza nome'));

  -- Se l'invito e' per qualcun altro, quella persona deve saperlo: altrimenti
  -- si trova un codice in piu' e non capisce da dove arriva.
  if v_dest <> auth.uid() then
    perform public.avvisa(array[v_dest], 'mission',
      'Hai un invito in più',
      'L''amministrazione te ne ha dato uno da spendere. Scegli bene: vale come gli altri.',
      '/invite', 'invito-extra-' || v_code);
  end if;

  return v_code;
end $fn$;

grant execute on function public.admin_crea_invito(uuid, text) to authenticated;


create or replace function public.admin_revoca_invito(p_code text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_inviter uuid;
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  if char_length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Serve una motivazione: resta scritta.';
  end if;

  select inviter_id into v_inviter from public.invites
   where code = p_code and used_at is null;
  if not found then
    raise exception 'Invito inesistente, oppure già usato: un invito speso non si ritira.';
  end if;

  update public.invites set revocato_il = now() where code = p_code;

  insert into public.admin_audit(admin_id, action, target_type, target_id, reason)
  values (auth.uid(), 'revoca_invito', 'user', v_inviter, trim(p_motivo));
end $fn$;

grant execute on function public.admin_revoca_invito(text, text) to authenticated;


-- ============================================================
-- 4. UN INVITO REVOCATO NON VALE PIU'
-- ============================================================
-- `invite_is_valid` e' aperta ad `anon`: la chiama la schermata di
-- registrazione, prima che esista un account. Rigenerata dal testo
-- dell'ultima definizione (20260824_inviti.sql), cambia una riga.
create or replace function public.invite_is_valid(p_code text)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.invites
     where code = upper(trim(p_code))
       and used_at is null
       and revocato_il is null
  );
$fn$;

grant execute on function public.invite_is_valid(text) to anon, authenticated;


-- ============================================================
-- 5. IL PANNELLO LI VEDE TUTTI
-- ============================================================
create or replace function public.admin_inviti()
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
begin
  if not public.is_admin_user() then raise exception 'Accesso negato'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'code', i.code,
      'nominativo', i.nominativo,
      'creato_il', i.created_at,
      'usato_il', i.used_at,
      'revocato_il', i.revocato_il,
      'da_admin', i.creato_da_admin,
      'inviter_id', i.inviter_id,
      'inviter_nome', u.nome,
      'invitato_nome', iu.nome
    ) order by i.created_at desc), '[]'::jsonb)
    from public.invites i
    join public.users u on u.id = i.inviter_id
    left join public.users iu on iu.id = i.invited_user_id
  );
end $fn$;

grant execute on function public.admin_inviti() to authenticated;


-- ============================================================
-- 6. I PROPRI INVITI PORTANO ANCHE IL NOME
-- ============================================================
-- Rigenerata dal testo dell'ultima definizione (20260824_inviti.sql): cambiano
-- le colonne restituite, non la logica. `ensure_invites_for` resta la prima
-- riga — è quella che crea l'invito a chi non ne ha ancora uno, e toglierla
-- lascerebbe la schermata vuota per sempre a chi si è appena iscritto.
--
-- ⚠️ `drop` e non `create or replace`: cambia il tipo di ritorno, e PostgreSQL
--    non lo permette su una funzione esistente (errore 42P13).
drop function if exists public.my_invites();

create function public.my_invites()
returns table (
  code text,
  usato boolean,
  invitato text,
  used_at timestamptz,
  nominativo text,
  revocato boolean
)
language plpgsql security definer set search_path = public as $fn$
begin
  perform public.ensure_invites_for(auth.uid());
  return query
    select i.code,
           i.used_at is not null,
           u.nome,
           i.used_at,
           i.nominativo,
           i.revocato_il is not null
    from public.invites i
    left join public.users u on u.id = i.invited_user_id
    where i.inviter_id = auth.uid()
    order by i.used_at nulls first, i.created_at;
end $fn$;

grant execute on function public.my_invites() to authenticated;

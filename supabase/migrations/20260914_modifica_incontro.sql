-- ============================================================
-- UN INCONTRO SI PUO' CORREGGERE
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- ============================================================
--
-- NB: questa funzione era nata dentro 20260912, ma quel file era gia' stato
-- eseguito. Un file di migrazione che cambia dopo essere stato applicato e' il
-- modo migliore per non sapere piu' cosa gira davvero in produzione: sta qui,
-- con un numero suo.

-- Non solo annullare: un'ora sbagliata, un titolo con un refuso, due posti in
-- più. Finora l'unica strada era annullare e rifare — e rifare significa che
-- chi si era iscritto deve iscriversi di nuovo, cioè quasi sempre non lo fa.
--
-- Il LUOGO non si tocca da qui, di proposito: cambiare coordinate a un
-- incontro a cui la gente si è già iscritta è un'altra cosa — è disdire e
-- rifare — e va detto, non fatto di nascosto con un campo di testo.
--
-- E ogni modifica avvisa chi partecipa: un cambio d'ora che nessuno legge è
-- peggio dell'ora sbagliata.
create or replace function public.modifica_incontro(
  p_id          uuid,
  p_titolo      text,
  p_descrizione text default null,
  p_quando      timestamptz default null,
  p_posti       int default null
) returns void language plpgsql security definer set search_path = public as $fn$
declare
  e public.events%rowtype;
  v_iscritti int;
  v_dest uuid[];
  v_cambi text[] := array[]::text[];
begin
  select * into e from public.events where id = p_id for update;
  if not found then raise exception 'Incontro inesistente'; end if;
  if e.host_id <> auth.uid() and not public.is_admin_user() then
    raise exception 'Puoi modificare solo gli incontri che hai proposto tu';
  end if;
  if e.stato <> 'aperto' then
    raise exception 'Questo incontro è chiuso: non si modifica più.';
  end if;

  if char_length(trim(coalesce(p_titolo, ''))) < 3 then
    raise exception 'Il titolo serve: è quello che si legge nell''elenco.';
  end if;

  -- I posti non scendono sotto chi si e' gia' iscritto: sarebbe cacciare
  -- qualcuno che aveva gia' detto di venire.
  select count(*) into v_iscritti from public.event_participants where event_id = p_id;
  if p_posti is not null and p_posti < greatest(v_iscritti, 1) then
    raise exception 'Ci sono già % iscritti: non puoi scendere sotto.', v_iscritti;
  end if;

  if p_quando is not null and p_quando <> e.quando then
    v_cambi := v_cambi || ('ora: ' || to_char(p_quando, 'DD/MM alle HH24:MI'));
  end if;
  if trim(p_titolo) <> e.titolo then
    v_cambi := v_cambi || ('titolo: ' || trim(p_titolo));
  end if;

  update public.events set
    titolo      = trim(p_titolo),
    descrizione = nullif(trim(coalesce(p_descrizione, '')), ''),
    quando      = coalesce(p_quando, e.quando),
    posti       = coalesce(p_posti, e.posti)
  where id = p_id;

  if array_length(v_cambi, 1) > 0 then
    select array_agg(user_id) into v_dest
      from public.event_participants where event_id = p_id and user_id <> auth.uid();
    if v_dest is not null then
      perform public.avvisa(v_dest, 'event',
        trim(p_titolo) || ': è cambiato qualcosa',
        array_to_string(v_cambi, ' · ') || '. Controlla che ti torni.',
        '/event/' || p_id::text,
        'incontro-modificato-' || p_id::text || '-' || extract(epoch from now())::bigint::text);
    end if;
  end if;

  if public.is_admin_user() and e.host_id <> auth.uid() then
    insert into public.admin_audit(admin_id, action, target_type, target_id, reason)
    values (auth.uid(), 'modifica_incontro', 'event', p_id, trim(p_titolo));
  end if;
end $fn$;

grant execute on function public.modifica_incontro(uuid, text, text, timestamptz, int) to authenticated;

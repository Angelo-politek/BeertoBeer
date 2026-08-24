-- BeerToBeer — ci si puo' unire a un incontro appena cominciato (30/08/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- IL BUG
-- L'app elencava gli incontri fino a 6 ore DOPO l'orario di inizio, ma questa
-- funzione li rifiutava appena `quando <= now()`. Per sei ore l'incontro
-- restava visibile in bacheca e sulla mappa, e chi provava a unirsi riceveva
-- un errore. Il modulo di creazione propone le 21:00 come orario predefinito:
-- bastava collaudare dopo cena per inciamparci, ed e' esattamente quello che
-- e' successo il 24/08 alle 23:22.
--
-- E' lo stesso identico difetto della chat bloccata sullo stato 'arrivato':
-- un elenco cambiato da una parte e non dall'altra.
--
-- LA REGOLA, ORA UNA SOLA
-- Un incontro si puo' raggiungere finche' non sono passate 6 ore dall'inizio.
-- Le stesse 6 ore stanno in lib/events.ts (MINUTI_TOLLERANZA_INCONTRO = 360),
-- e un test legge QUESTO file per verificare che i due numeri coincidano.
-- Se cambi l'intervallo qui, cambialo anche li': il test fallisce apposta.

create or replace function public.join_event_v21(p_event_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  e public.events%rowtype;
  n int;
begin
  select * into e from public.events where id = p_event_id for update;

  -- Messaggi distinti: «non esiste», «annullato» e «troppo tardi» mandavano
  -- tutti lo stesso errore generico, e chi lo riceveva non sapeva se avesse
  -- sbagliato qualcosa.
  if not found then
    raise exception 'Questo incontro non esiste piu''.';
  end if;
  if e.stato <> 'aperto' then
    raise exception 'Questo incontro e'' stato chiuso dall''organizzatore.';
  end if;
  if e.quando <= now() - interval '6 hours' then
    raise exception 'Questo incontro e'' finito.';
  end if;

  if e.host_id = auth.uid() then return 'host'; end if;
  if exists (select 1 from public.event_participants
             where event_id = p_event_id and user_id = auth.uid()) then
    return 'joined';
  end if;

  select count(*) into n from public.event_participants where event_id = p_event_id;
  if n < e.posti then
    insert into public.event_participants(event_id, user_id)
      values (p_event_id, auth.uid()) on conflict do nothing;
    delete from public.event_waitlist
      where event_id = p_event_id and user_id = auth.uid();
    return 'joined';
  end if;

  insert into public.event_waitlist(event_id, user_id)
    values (p_event_id, auth.uid()) on conflict do nothing;
  return 'waitlisted';
end $$;

grant execute on function public.join_event_v21(uuid) to authenticated;

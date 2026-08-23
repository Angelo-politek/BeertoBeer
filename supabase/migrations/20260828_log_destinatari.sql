-- BeerToBeer — nel registro delle notifiche compaiono i nomi (28/08/2026).
-- Eseguire DOPO 20260827_economia_e_diagnostica.sql. Sicuro da rieseguire.
--
-- PERCHÉ
-- Il registro diceva "destinatari: 1, esito: inviata" ma non CHI. Con due
-- persone che provano insieme non si distingue una notifica non arrivata da
-- una arrivata sull'altro telefono — ed è una differenza che cambia tutto:
-- "Richiesta accettata" va a chi ha pubblicato la richiesta, non a chi
-- consegna. Chi accetta non deve ricevere niente, ed è corretto così.

alter table public.push_log add column if not exists destinatari_nomi text;

create or replace function public.push_to_users(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_url text
)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url    constant text := 'https://kjxahufzseybvxtfsiwu.supabase.co';
  v_secret text;
  v_dest   int := coalesce(array_length(p_user_ids, 1), 0);
  v_token  int := 0;
  v_nomi   text;
begin
  if p_user_ids is null or v_dest = 0 then
    insert into public.push_log (titolo, destinatari, esito, dettaglio)
      values (p_title, 0, 'saltata', 'nessun destinatario');
    return;
  end if;

  select string_agg(nome, ', ' order by nome) into v_nomi
    from public.users where id = any(p_user_ids);

  -- Quanti dei destinatari hanno davvero un telefono registrato: se è zero,
  -- il problema non è la notifica ma il fatto che nessuno la può ricevere.
  select count(*) into v_token from public.push_tokens where user_id = any(p_user_ids);
  if v_token = 0 then
    insert into public.push_log (titolo, destinatari, con_token, esito, dettaglio, destinatari_nomi)
      values (p_title, v_dest, 0, 'saltata', 'nessun destinatario ha un telefono registrato', v_nomi);
    return;
  end if;

  select value into v_secret from public.app_secrets where key = 'push_shared_secret';

  begin
    perform net.http_post(
      url := v_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', coalesce(v_secret, '')
      ),
      body := jsonb_build_object(
        'userIds', to_jsonb(p_user_ids),
        'title', p_title,
        'body', p_body,
        'url', p_url
      )
    );
    insert into public.push_log (titolo, destinatari, con_token, esito, destinatari_nomi)
      values (p_title, v_dest, v_token, 'inviata', v_nomi);
  exception when others then
    insert into public.push_log (titolo, destinatari, con_token, esito, dettaglio, destinatari_nomi)
      values (p_title, v_dest, v_token, 'errore', sqlerrm, v_nomi);
  end;
end; $$;

-- Da rileggere così:
--   select creato_il, titolo, destinatari_nomi, con_token, esito, dettaglio
--   from public.push_log order by creato_il desc limit 30;

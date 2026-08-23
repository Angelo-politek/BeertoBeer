-- BeerToBeer — prova delle notifiche (25/08/2026).
-- Eseguire DOPO 20260824_inviti.sql. Sicuro da rieseguire.
--
-- Serve alla schermata Impostazioni → Notifiche: un pulsante che manda una
-- notifica a sé stessi. È l'unico modo per sapere DAVVERO se la catena
-- funziona (permesso del telefono → token salvato → funzione push → Expo →
-- telefono). Senza, l'unico modo per accorgersi che le notifiche non arrivano
-- è non ricevere mai una richiesta e non capire perché.
create or replace function public.send_test_push()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Devi essere autenticato';
  end if;
  perform public.push_to_users(
    array[auth.uid()],
    'Funziona',
    'Se leggi questa notifica, le riceverai anche quando arriva una richiesta.',
    '/notifications'
  );
end $$;

grant execute on function public.send_test_push() to authenticated;

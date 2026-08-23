-- BeerToBeer — rifiniture settimana 3 (23/08/2026).
-- Eseguire DOPO 20260822_beta_hardening.sql. Sicuro da rieseguire.

-- ============================================================
-- Promozione dalla lista d'attesa: avvisare chi entra
--
-- leave_event_v21 promuove il primo in lista quando qualcuno rinuncia, ma lo
-- faceva in silenzio: la persona restava convinta di essere ancora in attesa e
-- all'incontro non si presentava. Un posto liberato e non usato è il modo più
-- stupido di far fallire un incontro.
--
-- La push è best-effort come tutte le altre (push_to_users non solleva mai):
-- se non parte, la promozione resta comunque valida.
-- ============================================================
create or replace function public.leave_event_v21(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  promoted uuid;
  v_titolo text;
begin
  perform 1 from public.events where id = p_event_id for update;

  delete from public.event_participants where event_id = p_event_id and user_id = auth.uid();
  delete from public.event_waitlist     where event_id = p_event_id and user_id = auth.uid();

  select user_id into promoted
    from public.event_waitlist
    where event_id = p_event_id
    order by created_at
    for update skip locked
    limit 1;

  if promoted is not null then
    delete from public.event_waitlist where event_id = p_event_id and user_id = promoted;
    insert into public.event_participants(event_id, user_id)
      values (p_event_id, promoted)
      on conflict do nothing;

    select titolo into v_titolo from public.events where id = p_event_id;
    perform public.push_to_users(
      array[promoted],
      'Sei dentro!',
      'Si è liberato un posto per ' || coalesce(v_titolo, 'l''incontro') || '.',
      '/event/' || p_event_id
    );
  end if;
end $$;

grant execute on function public.leave_event_v21(uuid) to authenticated;

-- BeerToBeer — la chat funziona anche quando chi porta è arrivato (24/08/2026).
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
--
-- IL BUG
-- La regola di scrittura della chat elencava gli stati in cui si può inviare:
--   accettato, in_consegna, consegnato, confermato
-- Lo stato 'arrivato' è stato aggiunto dopo (migrazione v2) e non è mai stato
-- aggiunto a questo elenco. Risultato: la chat si blocca ESATTAMENTE nel
-- momento in cui serve di più — chi porta è sotto casa e vorrebbe scrivere
-- "che citofono?", e il messaggio viene rifiutato.
--
-- 'annullato' resta fuori di proposito: a giro annullato non si scrive più.

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.stato in ('accettato', 'in_consegna', 'arrivato', 'consegnato', 'confermato')
        and (o.host_id = auth.uid() or o.driver_id = auth.uid())
        -- pair_blocked è SECURITY DEFINER: vede i blocchi di ENTRAMBE le direzioni
        and not public.pair_blocked(o.host_id, coalesce(o.driver_id, o.host_id))
    )
  );

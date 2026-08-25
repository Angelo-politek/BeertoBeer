-- ============================================================
-- UN GIRO CHE NASCE DA UN'USCITA
--
-- Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.
-- ============================================================
--
-- E' il ponte fra i due mondi, ed e' deliberatamente sottile: toccare
-- «passo dal minimarket di corso Vercelli fino alle 23» apre la schermata del
-- giro gia' compilata a meta', e il giro che ne esce ricorda da dove viene.
--
-- COSA QUESTO PONTE NON FA, e va detto perche' e' la parte importante.
-- Il giro NON diventa riservato a quella persona. Resta un giro normale: nel
-- feed di tutti, con le stesse regole, lo stesso costo in BeerCoin, lo stesso
-- codice di consegna, le stesse recensioni. `da_uscita_id` e' una PROVENIENZA,
-- non un diritto.
--
-- Perche' cosi'. Un giro riservato per quarantacinque minuti sarebbe invisibile
-- a tutta la citta' per quarantacinque minuti — per una persona che magari non
-- aprira' l'app. In una beta a trenta persone quello e' un giro che muore. La
-- prelazione e' una funzione da progettare quando ci sara' abbastanza gente
-- perche' «invisibile a tutti tranne uno» non significhi «invisibile».
--
-- Quello che il ponte fa e' molto piu' semplice, e basta: avvisa la persona
-- che si era resa disponibile. Si e' esposta dicendo dove sarebbe stata; la
-- cosa minima e' che sappia che qualcuno le ha risposto.


-- Il costo del giro non cambia: nessuna riga tocca set_order_credits ne'
-- accept_order. Un giro nato da un'uscita costa e rende esattamente come tutti
-- gli altri — premiare economicamente una forma sarebbe un algoritmo
-- travestito da gentilezza.

create or replace function public.avvisa_uscita_risposta()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_autore uuid;
  v_nome   text;
  v_birre  integer;
begin
  if new.da_uscita_id is null then return new; end if;

  select autore_id into v_autore from public.uscite where id = new.da_uscita_id;
  if v_autore is null or v_autore = new.host_id then return new; end if;

  -- Chi ha bloccato chi non si avvisa a vicenda. La stessa regola vale gia'
  -- nella vista, ma la vista non copre l'insert: senza questo controllo, il
  -- blocco si aggirerebbe da qui.
  if public.pair_blocked(v_autore, new.host_id) then return new; end if;

  select nome into v_nome from public.users where id = new.host_id;
  select public.birre_totali(new.lista_birre) into v_birre;

  perform public.avvisa(
    array[v_autore],
    'order',
    coalesce(v_nome, 'Qualcuno') || ' ha risposto',
    'Ha chiesto ' || v_birre || case when v_birre = 1 then ' birra' else ' birre' end
      || ' mentre sei fuori. Se ti va, il giro è tuo.',
    '/request/' || new.id::text,
    'uscita-risposta-' || new.id::text);

  return new;
end $fn$;

drop trigger if exists on_order_da_uscita on public.orders;
create trigger on_order_da_uscita after insert on public.orders
  for each row execute function public.avvisa_uscita_risposta();


-- ============================================================
-- QUANTE VOLTE UN'USCITA HA PORTATO A QUALCOSA
-- ============================================================
-- Serve alla reputazione, e si legge senza tenere nessun contatore
-- sincronizzato: i contatori duplicati sono il modo in cui i numeri divergono.
--
-- ⚠️ SI CONTANO SOLO LE RICHIESTE RICEVUTE, MAI LE USCITE DICHIARATE.
-- Se contassi le dichiarazioni, chi si rende disponibile cinque volte e non
-- riceve mai una richiesta risulterebbe «0 su 5»: sembrerebbe inaffidabile
-- senza averne colpa, e la conseguenza sarebbe che smette di dichiararsi.
-- L'app punirebbe esattamente il comportamento che vuole incoraggiare.
create or replace function public.uscite_riepilogo(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'uscite',    (select count(*) from public.uscite u where u.autore_id = p_user),
    'ricevute',  (select count(*) from public.orders o
                   join public.uscite u on u.id = o.da_uscita_id
                  where u.autore_id = p_user),
    'portate',   (select count(*) from public.orders o
                   join public.uscite u on u.id = o.da_uscita_id
                  where u.autore_id = p_user and o.driver_id = p_user
                    and o.stato = 'confermato')
  );
$fn$;

grant execute on function public.uscite_riepilogo(uuid) to authenticated;

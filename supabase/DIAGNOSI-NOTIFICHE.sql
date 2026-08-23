-- ============================================================
-- DIAGNOSI NOTIFICHE — solo letture, non modifica niente.
--
-- Incolla TUTTO nel SQL Editor ed esegui. Escono cinque tabelle:
-- copiale e mandale. Sono le risposte alle domande che restano aperte
-- sul perché le notifiche automatiche non arrivano mentre quella di
-- prova sì.
-- ============================================================

-- 1. I MECCANISMI AUTOMATICI ESISTONO?
-- Devono comparire almeno questi due:
--   on_order_new_push     → notifica "nuova richiesta" (quando si pubblica)
--   on_order_status_push  → notifica di cambio stato (accettato, in consegna…)
-- Se mancano, il database non sta nemmeno provando a mandare niente: è quello
-- il problema, non le push.
select 'TRIGGER SU ORDERS' as controllo, tgname as nome,
       case when tgenabled = 'D' then 'DISATTIVATO' else 'attivo' end as stato
from pg_trigger
where tgrelid = 'public.orders'::regclass and not tgisinternal
order by tgname;

-- 2. IL REGISTRO DEI TENTATIVI
-- Compare solo se hai eseguito la migrazione 20260827. Se la tabella non
-- esiste, l'errore te lo dice: significa che quella migrazione manca.
select 'REGISTRO PUSH' as controllo, creato_il, titolo,
       destinatari, con_token, esito, dettaglio
from public.push_log
order by creato_il desc
limit 30;

-- 3. CHI PUÒ RICEVERE NOTIFICHE
-- "telefoni_registrati" a 0 significa che quella persona non riceverà mai
-- niente, per quanto i meccanismi funzionino.
select 'UTENTI' as controllo, u.nome, u.citta,
       (select count(*) from public.push_tokens t where t.user_id = u.id) as telefoni_registrati,
       u.is_admin
from public.users u
order by u.created_at;

-- 4. I GIRI DELLA PROVA
-- Serve a incrociare gli orari con il registro: un giro passato ad
-- "accettato" alle 21:30 deve avere un tentativo di notifica alle 21:30.
select 'GIRI' as controllo, id, stato, citta, host_id, driver_id, created_at, updated_at
from public.orders
order by updated_at desc
limit 10;

-- 5. LA CODA DI INVIO DI pg_net
-- Qui finiscono le richieste HTTP fatte dal database. Se è vuota mentre il
-- registro dice "inviata", il problema è fra database e rete; se contiene
-- errori, li leggiamo direttamente.
select 'RISPOSTE HTTP' as controllo, id, status_code,
       left(coalesce(content, error_msg, ''), 200) as risposta, created
from net._http_response
order by created desc
limit 15;

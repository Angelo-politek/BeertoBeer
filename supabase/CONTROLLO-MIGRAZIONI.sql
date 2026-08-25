-- BeerToBeer — «quali migrazioni ho gia' applicato?»
--
-- Incolla tutto nel SQL Editor di Supabase e premi Run. NON MODIFICA NIENTE:
-- legge soltanto. Ogni riga dice APPLICATA o DA APPLICARE.
--
-- Serviva perche' le migrazioni si lanciano a mano una alla volta e dopo
-- qualche giorno non e' piu' ovvio a che punto si era arrivati. Tirare a
-- indovinare qui significa o rilanciare cose gia' fatte, o credere attiva una
-- correzione che non c'e'.

with controlli as (

  select 1 as ordine,
         '20260824_inviti' as migrazione,
         'Si entra solo su invito' as a_cosa_serve,
         exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'invites') as applicata

  union all
  select 2, '20260825_notifiche',
         'Pulsante "mandami una notifica di prova"',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'send_test_push')

  union all
  select 3, '20260826_fix_feed',
         'Feed e mappa (colonna updated_at nella vista)',
         exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'open_requests'
                   and column_name = 'updated_at')

  union all
  select 4, '20260827_economia_e_diagnostica',
         'BeerCoin piu'' rari + registro delle notifiche',
         exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'push_log')

  union all
  select 5, '20260828_log_destinatari',
         'Il registro dice A CHI e'' andata la notifica',
         exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'push_log'
                   and column_name = 'destinatari_nomi')

  union all
  -- Questa non si vede da una tabella: e' scritta dentro la regola di
  -- scrittura della chat. Senza 'arrivato' la chat si blocca proprio quando
  -- chi porta e' sotto casa e vorrebbe chiedere il citofono.
  select 6, '20260829_chat_arrivato',
         'La chat funziona anche quando chi porta e'' arrivato',
         exists (select 1 from pg_policies
                 where schemaname = 'public'
                   and tablename = 'messages'
                   and policyname = 'messages_insert_participants'
                   and cmd = 'INSERT'
                   and with_check like '%arrivato%')

  union all
  -- Non si vede da una tabella: la tolleranza sta dentro la funzione che
  -- decide se ci si puo' ancora unire a un incontro gia' cominciato.
  select 7, '20260830_tolleranza_incontri',
         'Ci si puo'' unire a un incontro appena cominciato',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'join_event_v21'
                   and pg_get_functiondef(p.oid) like '%6 hours%')

  union all
  select 8, '20260831_regole_e_limiti',
         'Limiti anti-spam, tetto birre, confini citta'' nel database',
         exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'city_bounds')

  union all
  -- Il tetto dei BeerCoin dentro la formula del peso: 10 era il vecchio, 14 il nuovo.
  select 9, '20260901_taratura_crediti',
         'La distanza vale 1 BeerCoin al km, tetto a 14',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'credits_for_weight'
                   and pg_get_functiondef(p.oid) like '%least(14%')

  union all
  select 10, '20260902_segnalazioni',
         'Segnalazioni come fascicolo, provvedimenti, giro congelabile',
         exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'reports'
                   and column_name = 'dichiarazione_segnalato')

  union all
  select 11, '20260903_link_pubblico',
         'Link del giro apribile da chiunque, anche senza app',
         exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'order_share_links')

  union all
  -- Si riconosce dal canale prioritario: e' l'unica cosa nuova che si vede
  -- dall'esterno, il resto sono funzioni di sola lettura.
  select 12, '20260904_pannello_admin',
         'Scheda utente, statistiche, notifiche di sicurezza prioritarie',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'admin_scheda_utente')

  union all
  select 13, '20260905_persone',
         'Incontri/eventi con locandina, chat di gruppo, amici',
         exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'amicizie')
)

select ordine as n,
       migrazione,
       case when applicata then 'APPLICATA' else '>>> DA APPLICARE <<<' end as stato,
       a_cosa_serve
from controlli
order by ordine;

# Come si pubblica questo aggiornamento

Guida operativa, da seguire in ordine. Scritta per essere eseguita da chi non
ha scritto questo codice.

**Nessun APK nuovo.** `app.json` è rimasto a `version: "1.1.0"`, quindi il
runtime non cambia e l'aggiornamento arriva ai telefoni già installati via OTA.
Nessuno deve reinstallare niente.

---

## 0. Prima di cominciare — due minuti

Da terminale, nella cartella del progetto:

```
npm test
npx tsc --noEmit
npx expo lint
```

Devono passare tutti e tre, senza errori e senza avvisi.

---

## 1. Il database, PRIMA dell'app

> ⚠️ **L'ordine non è un consiglio, è la cosa più importante di questa pagina.**
> L'app nuova chiede a `open_requests` due colonne che oggi quella vista non
> ha. Se pubblichi l'OTA prima delle migrazioni, il database risponde «colonna
> inesistente» e **feed e mappa restano vuoti mostrando un errore che sembra di
> connessione**. È già successo il 26 agosto, ed è raccontato nell'intestazione
> di `supabase/migrations/20260826_fix_feed.sql`.

Nel **SQL Editor di Supabase**, apri ed esegui questi nove file **in questo
ordine**, uno alla volta, aspettando che ciascuno finisca:

| # | File | Cosa fa |
|---|---|---|
| 1 | `supabase/migrations/20260906_scudo_beta.sql` | Le sei correzioni di sicurezza dello Scudo |
| 2 | `supabase/migrations/20260907_scadenza_e_feed.sql` | `scade_il`, `ttl_giro()`, e la vista del feed ricostruita |
| 3 | `supabase/migrations/20260908_uscite.sql` | La tabella `uscite` e le sue guardie |
| 4 | `supabase/migrations/20260909_giro_da_uscita.sql` | Il ponte fra un'uscita e un giro |
| 5 | `supabase/migrations/20260910_le_parole_delle_push.sql` | Le notifiche riscritte (nessuna schermata cambia) |
| 6 | `supabase/migrations/20260911_zona_non_e_un_indirizzo.sql` | **La fuga di indirizzo: questa per prima, se ne salti** |
| 7 | `supabase/migrations/20260912_incontri_e_pannello.sql` | Annullare incontri + il badge segnalazioni che si spegne |
| 8 | `supabase/migrations/20260913_inviti.sql` | Nome sull'invito + gestione dal pannello |
| 9 | `supabase/migrations/20260914_modifica_incontro.sql` | Correggere un incontro senza rifarlo |

Tutte e nove sono **sicure da rieseguire**: se hai un dubbio su quale hai
già lanciato, rilanciala. Non cancellano niente.

### Verifiche subito dopo, sempre dal SQL Editor

Copia e incolla, una alla volta. Ognuna deve rispondere quello che c'è scritto.

```sql
-- 1. La vista del feed ha le colonne nuove. Deve restituire 3 righe.
select column_name from information_schema.columns
 where table_name = 'open_requests'
   and column_name in ('congelato', 'scade_il', 'da_uscita_id');

-- 2. Una segnalazione non sospende più nessuno da sola.
--    Nel testo della funzione NON deve comparire «sospeso_fino».
select prosrc like '%sospeso_fino%' as sospende_ancora
  from pg_proc where proname = 'handle_new_report';
--    atteso: false

-- 3. Due amici possono scriversi anche senza giri in comune.
select prosrc like '%sono_amici%' as amici_ammessi
  from pg_proc where proname = 'pair_allowed';
--    atteso: true

-- 4. La tabella delle uscite esiste ed è protetta.
select relrowsecurity from pg_class where relname = 'uscite';
--    atteso: true

-- 5. Nessun giro ha perso la scadenza.
select count(*) from public.orders where scade_il is null;
--    atteso: 0
```

Se una di queste non risponde come atteso, **fermati qui** e non pubblicare
l'OTA: il database e l'app resterebbero disallineati.

---

## 2. L'app

```
eas update --channel preview --platform android --message "Chi è fuori, e i sette difetti del collaudo"
```

`--platform android` non è opzionale: l'esportazione web è rotta (`window is
not defined`) e senza questo flag il comando fallisce prima di pubblicare.

I tester la ricevono **alla prima riapertura dell'app**, senza reinstallare
niente. Al riavvio vedono una banda in cima alla schermata iniziale che dice
cos'è cambiato — una volta sola.

---

## 3. Prova su un telefono vero, dieci minuti

Nell'ordine. Serve un secondo account per i punti 4-6.

1. **Il feed si apre.** Se è vuoto ma senza errori, va bene: significa che non
   ci sono giri aperti. Se dice «La città non risponde», le migrazioni non sono
   andate: torna al punto 1.
2. **La barra ha quattro voci**: GIRI · MAPPA · FUORI · PROFILO. La terza non
   naviga: apre un foglio dal basso, e il tasto indietro di Android lo chiude
   senza uscire dalla schermata sotto.
3. **Cronometro alla mano**: dalla schermata iniziale a «Sono fuori» in meno di
   quindici secondi e due tocchi, senza scrivere niente. Chiudi e riapri l'app:
   la tab centrale ora mostra l'ora fino a cui sei fuori.
4. **Dal secondo telefono**: la persona compare in «CHI È FUORI». Se aveva
   scelto «passo dal negozio», sotto il nome c'è «Chiedi un giro» — toccalo, e
   la schermata del giro si apre con una banda gialla che dice a chi stai
   rispondendo.
5. **Segnalazione con messaggio lungo**: apri un giro, «Segnala», scrivi un
   testo di cinque righe con la tastiera aperta. Il pulsante «Segnala» deve
   restare raggiungibile scorrendo.
6. **Chi porta ha una faccia**: fatti accettare un giro dal secondo telefono.
   Sul primo, nel dettaglio, deve comparire avatar e nome di chi porta, con il
   link al profilo. Prima leggevi solo «un driver ha accettato».
7. **Da admin**: Profilo → Amministrazione → Giri. L'elenco dei giri in corso,
   ordinato per quanto sono fermi. Chiudine uno: entrambe le persone ricevono
   una notifica.
8. **Gli amici**: Profilo → Amici, in un tocco. E prova a scrivere a un amico
   con cui non hai mai fatto un giro: prima la chat rifiutava il messaggio.

---

## 4. Cosa scrivere ai tester

> L'app si è aggiornata da sola, non devi fare niente.
>
> C'è una cosa nuova: adesso puoi dire che **sei fuori** — dal tasto in mezzo
> alla barra. Ci vogliono quindici secondi, si chiude da sola dopo qualche ora,
> e puoi rientrare quando vuoi. Se passi da un minimarket, chi ha bisogno di
> birre in zona ti vede.
>
> E sono sistemate tutte le cose che ci avete segnalato: il pulsante «invia»
> della segnalazione che spariva, il profilo di chi accetta che non si vedeva,
> i giri rimossi che restavano attivi, quelli che non si riuscivano a fermare.
>
> Se qualcosa non va: **Profilo → Dicci cosa non va**. Anche le cose piccole.

---

## 5. Le tre decisioni — prese il 25/08/2026

**1 · Il repository è pubblico.** Quindi `APK_URL` punta a
`releases/latest/download/beer-to-beer.apk`, che segue sempre l'ultima release
e non va più aggiornato a mano. ⚠️ Perché regga: la release **non** deve essere
marcata «pre-release», e l'allegato deve chiamarsi **esattamente**
`beer-to-beer.apk`. Con un nome diverso il link dà 404 e chi riceve un invito
sbatte contro un muro.

**Due conseguenze già applicate**, perché un repository pubblico cambia cosa è
prudente lasciare in giro:
- `dist-v2-check/` e `dist-v21-check/` non sono più tracciate. Erano 116 file
  di build con dentro l'URL del progetto e la anon key: non è una fuga — quella
  chiave è pubblica per costruzione e sta dentro ogni APK distribuito — ma in
  un repo pubblico *sembra* una chiave committata. `SECURITY.md` lo spiega
  prima che qualcuno lo chieda.
- `README.md` non è più «Welcome to your Expo app 👋» con il link al Discord di
  Expo. Era la porta d'ingresso di un progetto che si dichiara fatto dalla
  community.

**2 · Sentry è spento.** Il DSN era scritto in chiaro e mandava i crash di tutti
i tester a un progetto a cui nessuno del team ha accesso, mentre `app/terms.tsx`
— la pagina che promette di dire «chi vede cosa» — non nominava né la
diagnostica né una terza parte. Ora parte solo se esiste
`EXPO_PUBLIC_SENTRY_DSN`. **Il giorno in cui vorrai accenderlo davvero**: crea
un account su sentry.io, metti il DSN in quella variabile, e aggiungi una riga
ai termini. Senza la riga nei termini, non accenderlo.

**3 · «PORTA. BEVI. RIPETI.»** è la riga corretta del manifesto, registrata in
`Brand/CORREZIONI.md` con il perché. Il PDF della bible va riesportato con
quella riga quando capita di rimetterci mano: fino ad allora quel file è la
versione vera.

---

## 5b · Due cose che restano da fare, e non le posso fare io

**La licenza.** `README.md` dichiara AGPLv3, ma **il file `LICENSE` non c'è**.
Non l'ho scritto di proposito: il testo dell'AGPL è un documento legale di
34 KB, e riprodurlo a memoria è esattamente il genere di cosa che non va
approssimata. Aggiungilo da GitHub — *Add file → Create new file → nome
`LICENSE` → «Choose a license template» → GNU Affero General Public License
v3.0* — che inserisce il testo ufficiale esatto.

Poi aggiungi in fondo al file, o nel README, la riga che esclude il marchio:

> Il codice è AGPLv3. Nome, logo e i materiali in `Brand/` restano di Beer to
> Beer: puoi forkare il codice, non puoi chiamarlo Beer to Beer.

Senza quella riga, un fork può chiamarsi come noi.

**Il contatto per le segnalazioni di sicurezza.** `SECURITY.md` dice di
scrivere «al contatto nel profilo GitHub del proprietario del repository».
Se sul tuo profilo non c'è un'email pubblica, mettila — oppure sostituisci
quella riga con l'indirizzo che preferisci.

---

## 6. Se qualcosa va storto

**Il feed è vuoto e dice «La città non risponde».** Le migrazioni non sono
andate, o l'OTA è arrivato prima. Esegui la verifica 1 del punto 1: se le tre
colonne non ci sono, lancia `20260907_scadenza_e_feed.sql` e riapri l'app.

**Tornare indietro con l'app.** `eas update --channel preview --platform android`
di nuovo, da un commit precedente. Le migrazioni **non vanno annullate**: sono
tutte compatibili all'indietro, e il bundle vecchio continua a funzionarci
sopra. È il motivo per cui la policy DELETE su `orders` non è stata revocata
(vedi il commento in `20260906_scudo_beta.sql`) e per cui nessuna colonna è
stata tolta a nessuna vista.

**Un giro rimasto bloccato.** Profilo → Amministrazione → Giri → Chiudi il
giro. Le due persone vengono avvisate.

---

## Cosa contiene questo aggiornamento

Il dettaglio, con le motivazioni, sta in `TODO.md`. In breve:

**Lo Scudo beta** — i sette difetti del collaudo, più sei correzioni di
sicurezza nel database: la segnalazione che non sospende più nessuno da sola,
la chat fra amici riparata, i giri scaduti che smettono di bloccare una
persona per sempre, il codice di consegna che scade davvero, la chiusura
d'autorità che avvisa le due persone, l'annullamento che non cancella più le
prove.

**Le fondamenta della V3** — la scadenza di un giro che smette di stare in
quattro posti, la tabella `uscite`, e il test che protegge le viste (che ha
già ripagato: ha trovato una regressione appena introdotta).

**«Chi è fuori»** — la tab, il foglio da due tocchi, la sezione in cima alla
schermata iniziale, e il ponte verso i giri.

**La morte dell'algoritmo** — `smartScore` ordinava le richieste per
`ratingMedio × 4`, si chiamava «Per te», e metteva sistematicamente in fondo
chi era appena entrato. Ora si ordina per chi finisce prima.

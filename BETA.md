# Beta di Torino — come si rilascia e come si tiene in piedi

Guida operativa per chi manda in mano l'app alle persone. Scritta per essere
seguita da chi non programma.

---

## 1. Prima di costruire l'APK — lista di controllo

Niente di tutto il resto ha senso se questi punti non sono verdi.

- [ ] **Migrazioni applicate** nel SQL Editor di Supabase, in quest'ordine:
      `supabase/migrations/20260822_beta_hardening.sql`, poi
      `supabase/migrations/20260823_week3.sql`.
- [ ] **Segreto delle notifiche impostato.** Nel SQL Editor:
      `select value from public.app_secrets where key = 'push_shared_secret';`
      e lo stesso valore in *Edge Functions → Secrets* come `PUSH_SHARED_SECRET`.
- [ ] **Funzione `send-push` ripubblicata** con il contenuto aggiornato di
      `supabase/functions/send-push/index.ts`. ⚠️ In quest'ordine: prima il
      segreto, poi la pubblicazione. Al contrario le notifiche si spengono.
- [ ] **Prova che il buco sia chiuso**: una chiamata a
      `<url-progetto>/functions/v1/send-push` senza il segreto deve rispondere
      **401**. Se risponde altro, il passo precedente non è andato a buon fine.
- [ ] **Conferma email disattivata** in *Authentication → Providers → Email*
      (verificato il 22/08: era già così). Se si riattiva, i tester restano
      chiusi fuori senza capire perché.
- [ ] **Almeno un amministratore** esiste: `is_admin = true` su un utente, così
      qualcuno può moderare segnalazioni dal pannello.

---

## 2. Costruire l'APK

```
eas build --profile apk --platform android
```

Il profilo `apk` è quello giusto: produce un file installabile a mano. Gli altri
profili producono un pacchetto per lo store, che **non si può installare da un
link**.

A fine build EAS restituisce un indirizzo da cui scaricare il file.

---

## 3. Distribuirlo — e un errore da non ripetere

**Non mettere mai l'APK dentro il repository.** È esattamente ciò che ha bloccato
i push del progetto per settimane: GitHub rifiuta i file oltre 100 MB e il lavoro
di Alberto è rimasto fermo sul suo computer.

Il modo corretto è **GitHub → Releases → Draft a new release → allega l'APK come
file della release**. Lì i limiti sono ben più alti e il repository resta leggero.

Poi si condivide il link della release.

### Cosa scrivere ai tester

> Ciao! Questa è la beta chiusa di **Beer to Beer** a Torino.
>
> È un progetto no-profit e open source: ci si porta le birre a vicenda fra
> vicini, senza che nessuno ci guadagni. Chi porta viene rimborsato della spesa
> e riceve BeerCoin, che servono solo dentro l'app.
>
> 1. Scarica l'APK da questo link: `<link della release>`
> 2. Android chiederà di autorizzare l'installazione da questa origine: è normale
>    per le app non distribuite dal Play Store.
> 3. Registrati, scegli Torino, **attiva le notifiche** — senza non ti accorgi
>    delle richieste.
>
> Serve avere 18 anni. Le regole sono dentro l'app, in Impostazioni.
>
> Se qualcosa non va: **Profilo → Invia feedback**. Scrivi anche le cose
> piccole, servono più di quelle grandi.

---

## 4. Correggere durante la beta senza far reinstallare niente

Questa è la parte che fa risparmiare più tempo, ed è già configurata.

Le build del profilo `apk` sono agganciate al canale `preview`. Le correzioni che
riguardano **solo il codice dell'app** (schermate, testi, logica) si mandano ai
telefoni già installati con:

```
eas update --channel preview --message "descrizione della correzione"
```

I tester la ricevono alla riapertura dell'app, **senza reinstallare nulla**.

Serve invece un **APK nuovo** quando:

- cambia la versione dell'app in `app.json` (le versioni sono tenute separate);
- si aggiunge o aggiorna un componente nativo (mappe, notifiche, fotocamera…).

Le modifiche al **database** non richiedono né l'uno né l'altro: sono già attive
per tutti appena eseguite.

---

## 5. Cosa guardare mentre la beta gira

- **Segnalazioni dei tester** — dentro l'app, pannello admin → Feedback.
- **Crash** — su Sentry (il monitoraggio è già integrato nell'app).
- **Segnalazioni fra utenti** — pannello admin → Segnalazioni. Una richiesta
  segnalata viene nascosta subito e il suo autore sospeso in attesa di verifica:
  va guardata in fretta, perché blocca una persona in buona fede se il
  segnalatore ha esagerato.
- **Giri attivi** — pannello admin → mappa sicurezza, per vedere se qualcuno
  resta bloccato a metà consegna.
- **Supabase** — il piano gratuito mette in pausa un progetto dopo 7 giorni
  **senza attività**. Con una beta viva non succede.

### Il numero che conta davvero

Non gli iscritti: i **giri completati**. Un'app di questo tipo funziona solo se
chi chiede trova qualcuno che porta. Se dopo qualche giorno le richieste restano
aperte senza risposta, il problema non è tecnico — è che servono più persone
attive nella stessa zona, o in fasce orarie più concentrate.

---

## 6. Sui crash: una scelta da fare

Oggi le build non caricano su Sentry le "mappe dei sorgenti". Conseguenza: i
crash arrivano, ma il punto esatto del codice risulta illeggibile.

Per renderli leggibili serve creare un token nell'account Sentry del progetto e
metterlo fra i segreti della build; a quel punto si toglie
`SENTRY_DISABLE_AUTO_UPLOAD` da `eas.json`. Con 50 persone che usano l'app la
differenza fra "è crashato qualcosa" e "è crashato in questa riga" pesa parecchio.

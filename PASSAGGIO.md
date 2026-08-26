# Passaggio di consegne

Per chi riprende il lavoro da un altro computer, con un altro agente.

---

## 1. Prendere il codice

Tutto il lavoro è sul branch **`fix/beta-hardening`**, non su `main`.

```bash
git clone https://github.com/Angelo-politek/BeertoBeer.git
cd BeertoBeer
git checkout fix/beta-hardening
npm install
```

Serve un file `.env` (non è nel repository, e non deve esserci):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Chiedili ad Angelo. Sono le stesse due righe di `.env.example`.

Verifica che tutto stia in piedi prima di toccare qualsiasi cosa:

```bash
npm test          # devono passare tutti
npx tsc --noEmit  # nessun errore
npx expo lint     # nessun avviso
```

Se uno dei tre non è pulito, **il problema è l'ambiente, non il codice**: al
momento del passaggio erano verdi tutti e tre.

---

## 2. Leggere, in quest'ordine

1. **`TODO.md`** — lo stato, cosa è fatto e cosa no, e il piano ragionato
   completo con le motivazioni. È la fonte di verità.
2. **`Brand/fontbeer/brandbible_btb.pdf`** — 4 pagine. Vision, valori, tono di
   voce, palette, NEVER DO, mission. Vincola anche le decisioni tecniche: la
   morte di `smartScore` è stata una conseguenza diretta di «PIÙ COMMUNITY,
   MENO ALGORITMI».
3. **`RILASCIO.md`** — come si pubblica: migrazioni in ordine, verifiche SQL
   con il risultato atteso, comando `eas`.
4. **`SECURITY.md`** — cosa è pubblico per costruzione e cosa no.
5. **`AGENTS.md`** — Expo è cambiato: leggi i doc versionati a
   https://docs.expo.dev/versions/v54.0.0/ prima di scrivere codice.

E se vuoi capire davvero com'è fatta l'app: **leggi i commenti in cima alle
migrazioni in ordine di data**. Ognuno racconta un errore che è già costato
qualcosa. È un diario, ed è la parte migliore del repository.

---

## 3. Le cinque regole della casa

Valgono più di qualunque convenzione di stile. Ognuna è costata un incidente.

1. **SQL prima, app dopo. Sempre.** Due treni che non si sincronizzano: il
   database è istantaneo e globale, il bundle arriva quando la persona riapre
   l'app. L'ordine inverso ha già svuotato feed e mappa una volta — con un
   errore che sembrava di connessione, che è il modo migliore per non farsi
   trovare.
2. **Le funzioni SQL si rigenerano dal testo dell'ultima definizione, mai a
   memoria.** Riscriverne una per cambiare due righe è il modo esatto in cui si
   perde una guardia. `lib/__tests__/funzioni-non-perdono-pezzi.test.ts` legge
   i `.sql`: ogni funzione che ridefinisci va aggiunta a quella lista **prima**
   di toccarla.
   ⚠️ E controlla la **firma**, parametri compresi: sbagliarne uno non dà
   errore, crea un *overload*, e la versione vecchia continua a girare.
3. **Mai togliere una colonna da una vista letta dal client**, e mai aggiungere
   valori a `orders.stato` o a `notification_inbox.category` (il client ci
   indicizza dentro). Situazioni nuove = colonne nuove o tabelle nuove.
4. **Mai revocare un permesso prima che l'app abbia smesso di usarlo.** RPC
   nuova → aggiornamento → **attesa di due settimane** → revoca. C'è un debito
   aperto proprio su questo, vedi §5.
5. **`app.json.version` non è un numero di versione: è la chiave del canale
   degli aggiornamenti.** Con `runtimeVersion.policy: "appVersion"`, cambiarla
   rende invisibili tutti gli `eas update` successivi ai telefoni già
   installati — in silenzio, nessun errore. Il numero che le persone leggono
   sta in `constants/versione.ts`.

**Un file di migrazione già eseguito non si modifica.** Se serve aggiungere
qualcosa, si fa un file nuovo con un numero suo: altrimenti non si sa più cosa
gira davvero in produzione.

---

## 4. I test-guardia non sono burocrazia

In `lib/__tests__/` ogni file congela un difetto già successo. Si **estendono**,
mai si aggirano. I più importanti:

| File | Cosa impedisce |
|---|---|
| `viste-non-perdono-colonne` | che una vista ricostruita perda una colonna che il client chiede — l'incidente del 26 agosto |
| `funzioni-non-perdono-pezzi` | che una funzione riscritta perda una guardia |
| `uscite` | che si torni a pubblicare la via di casa di qualcuno |
| `scudo-beta` | i 17 difetti dei due collaudi |
| `glossario` | che rientri un sinonimo per una cosa che ha già un nome |
| `niente-dati-muti` | che una tabella raccolga dati che nessuna schermata mostra |

Se scrivi un test che legge il codice sorgente, ricorda che **i commenti citano
di proposito ciò che è stato tolto**: filtra i commenti prima di asserire, o il
test fallisce su se stesso. Ci sono già le funzioni `soloCodice` /
`senzaCommentiFile` negli altri test.

---

## 5. Debiti aperti, in ordine di urgenza

**a) `LICENSE` non esiste.** Il README dichiara AGPLv3, il repository è
pubblico, e il file manca: allo stato attuale il codice è *tutti i diritti
riservati*, cioè il contrario di quello che c'è scritto. Va aggiunto da GitHub
(*Add file → Create new file → `LICENSE` → Choose a license template → GNU AGPL
v3.0*), più la riga che esclude il marchio — senza, un fork può chiamarsi Beer
to Beer. **Non è un lavoro da agente**: un testo legale di 34 KB non si
riproduce a memoria.

**b) La policy DELETE su `orders` va revocata.** `annulla_giro_mio` è in
produzione dal 25/08 e il bundle nuovo la usa. Dopo due settimane piene —
quindi **dall'8 settembre** — in una migrazione nuova:

```sql
drop policy if exists "orders_delete" on public.orders;
```

Prima di allora no: i telefoni che non hanno ancora ricevuto l'aggiornamento
chiamano ancora la DELETE, e revocarla farebbe esplodere il loro pulsante
«Annulla richiesta» con un errore grezzo.

**c) `C6`, le parole. — IN CORSO dal 26/08/2026.** Le ~90 stringhe del database
erano già riscritte. Adesso esiste anche `constants/testi/` e il **contatore**
che misura il resto.

**S1 · la soglia è chiusa**: accesso, registrazione, recupero password,
conferma email, onboarding, invito — più `lib/auth-errors.ts`.
**S2 · il giro è chiusa**: il vocabolario condiviso (gli stati, i motivi per
cui un giro è fermo, le etichette della prossima azione), «I miei giri», la
recensione, `create-request`, `request/[id]` — 875 righe e 84 frasi, la più
grossa dell'app — e le tre chat.

**S3 · le persone è chiusa**: profilo, profilo altrui, amici, persone
bloccate, modifica profilo, vetrina. Restano il **sistema** (impostazioni,
notifiche, novità, segnalazioni, home, mappa, community, eventi) e il
**pannello admin**.

Il rendiconto lo stampa `npm test`, una riga sola:

```
C6 · 50 file su 102 parlano dai testi. Mancano 52.
```

Quando la lista `IN_DEROGA` di `lib/__tests__/glossario.test.ts` è vuota, C6 è
finito. **Non serve nessun altro rendiconto, e non se ne aggiungano.**

Come si toglie una riga da quella lista: si riscrivono le stringhe di quel file
e si spostano in `constants/testi/`. ⚠️ **Riscritte, non spostate**: una frase
brutta dentro un dizionario è una frase brutta congelata per due anni, con
l'aria di essere stata decisa. Il test fallisce anche se *lasci* una deroga che
non serve più, quindi la lista non può restare gonfia per pigrizia.

Il seguito è in `TODO.md`, sezione «Ondata 1 · C6 · stato del cantiere», che
dice anche **cosa resta in deroga di proposito** e perché.

**d) `C4`** (inbox unificata) e **`D5`** (reputazione come fatti, via il numero
1-5 dai profili): lavoro pulito, senza sorprese, già progettato in `TODO.md`.

**e) Tutta l'Ondata 3** (`E1`-`E6`): «chi risponde», IL PARI, la ritaratura
BeerCoin, IL QUADERNO, Milano. È il mese in cui i valori dichiarati diventano
funzioni dell'app. Non è cominciato.

---

## 6. La strada per la release definitiva

Nell'ordine. Ogni passo lascia comunque un'app migliore, quindi ci si può
fermare in qualunque punto.

1. **Chiudere `C6`.** Prima di ogni schermata nuova, per la ragione al §5c.
2. **`C4` e `D5`.** Completano l'Ondata 1 e 2.
3. **`C1`: l'APK.** È il momento in cui `app.json.version` diventa `3.0.0` e
   raggiunge `constants/versione.ts`. ⚠️ Da quel momento chi non reinstalla non
   riceve più aggiornamenti: va pianificato un passaggio netto, non lasciato
   derivare. `TODO.md` ha il piano completo — la tabella `app_release` esiste
   apposta per poter parlare anche ai telefoni rimasti indietro.
4. **L'Ondata 3**, se e quando la beta dice che serve.
5. **La release**: `eas build --profile apk --platform android`, poi una GitHub
   Release **non** pre-release con l'allegato chiamato **esattamente**
   `beer-to-beer.apk` — è quello che `APK_URL` si aspetta, e con un nome
   diverso il link d'invito dà 404.

**Come si misura se sta funzionando**, dal pannello: non gli iscritti, ma i
**giri conclusi**, il **tempo alla prima accettazione**, e **quante persone
hanno portato** negli ultimi 7 giorni. Se chi porta sono tre su trenta, l'app è
un delivery con tre fattorini non pagati — ed è un risultato che deve cambiare
il piano, non essere spiegato via. `TODO.md`, sezione «Come si misura».

---

## 7. Due cose che sembrano bug e non lo sono

- **Le coordinate arrotondate a ~1 km** nelle viste pubbliche sono volute: non
  si pubblica il punto esatto da cui una persona ha detto «sono qui». È anche
  il motivo per cui i marker si sovrappongono, e per cui esiste
  `lib/mappa-sovrapposti.ts`.
- **`zona` è solo il quartiere, mai la via.** Tre difese lo garantiscono
  (client, trigger, vista). Se ti sembra un dato povero, leggi
  `20260911_zona_non_e_un_indirizzo.sql` prima di arricchirlo.

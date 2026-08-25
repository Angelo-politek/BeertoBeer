# Beer to Beer

**Non è un delivery.** È una community open source dove le persone della stessa
città si portano birre a vicenda e, se entrambe lo vogliono, si conoscono
davanti a una birra.

Nessuno guadagna niente. L'app non vende birra e non vende incontri: chi porta
si fa rimborsare la spesa dalla persona a cui la porta, in contanti, sul posto,
e riceve BeerCoin — che valgono solo qui dentro, non si comprano, non si
passano a nessuno e non diventano denaro.

Si entra solo su invito, e ognuno ne ha uno solo.

> **PORTA. BEVI. RIPETI.**

---

> **Riprendi lo sviluppo da un altro computer?** Comincia da
> **[PASSAGGIO.md](PASSAGGIO.md)**: branch, ambiente, regole della casa e
> debiti aperti.

## Se vuoi capire com'è fatta

**Non cominciare dal codice.** Leggi i commenti in cima alle migrazioni, in
ordine di data:

```
supabase/migrations/
```

Ognuno racconta un errore che è già costato qualcosa — un feed rimasto vuoto
per una colonna dimenticata, una guardia persa riscrivendo una funzione, una
persona sospesa per due giorni da una segnalazione sbagliata. È un diario di
sbagli, ed è la parte del progetto di cui andiamo più fieri.

Lo stesso vale per `lib/__tests__/`: nessuno di quei test è burocrazia. Ognuno
è un difetto già successo, congelato perché non succeda di nuovo.

---

## Com'è fatta

- **App** — React Native + Expo (SDK 54), TypeScript. `app/` sono le
  schermate (expo-router), `components/` i pezzi condivisi, `lib/` la logica
  pura e testabile, `data/api.ts` **l'unico posto** che parla con la rete.
- **Server** — Supabase: Postgres con Row Level Security, Auth, Realtime,
  Storage, Edge Functions. Ogni scrittura che conta passa da una funzione
  `security definer`; il client non muove mai uno stato a mano.
- **Mappe** — MapLibre su tiles OpenStreetMap.
- **Notifiche** — Expo Push.

```bash
npm install
npm start          # dev
npm test           # i test-guardia
npx tsc --noEmit
npx expo lint
```

Serve un file `.env` con `EXPO_PUBLIC_SUPABASE_URL` e
`EXPO_PUBLIC_SUPABASE_ANON_KEY` — vedi `.env.example`.

Le migrazioni si applicano a mano dal SQL Editor di Supabase, in ordine di
data. Sono tutte scritte per essere rieseguibili: applicarle due volte non
cambia niente.

---

## Le cinque regole della casa

Valgono più di qualsiasi convenzione di stile, e ognuna è costata un incidente.

1. **SQL prima, app dopo. Sempre.** Sono due treni che non si sincronizzano: il
   database è istantaneo e globale, il bundle arriva quando la persona riapre
   l'app. L'ordine inverso ha già svuotato feed e mappa una volta.
2. **Le funzioni SQL si rigenerano dal testo dell'ultima definizione, mai a
   memoria.** Riscriverne una per cambiare due righe è il modo esatto in cui si
   perde una guardia. `lib/__tests__/funzioni-non-perdono-pezzi.test.ts` legge i
   `.sql`: ogni funzione che ridefinisci va aggiunta a quella lista **prima** di
   toccarla.
3. **Mai togliere una colonna da una vista letta dal client**, e mai aggiungere
   valori a `orders.stato`. Le situazioni nuove si esprimono con colonne nuove o
   tabelle nuove.
4. **Mai revocare un permesso prima che l'app abbia smesso di usarlo.** RPC
   nuova → aggiornamento → attesa → revoca.
5. **`app.json.version` non è un numero di versione: è la chiave del canale
   degli aggiornamenti.** Cambiarla rende invisibili tutti gli aggiornamenti
   successivi ai telefoni già installati, in silenzio. Il numero che le persone
   leggono sta in `constants/versione.ts`.

---

## Contribuire

Chi tiene questo progetto è **una persona sola**. Non è un'azienda con un team
di revisori, e non fingiamo di esserlo.

- Una pull request può restare aperta settimane. Non è maleducazione.
- Sopra le ~200 righe la risposta è «spezzala», senza leggerla.
- Prima di scrivere codice, apri una issue: se l'idea non ci sta, meglio
  saperlo prima.
- Le PR che rompono un test in `lib/__tests__/` si chiudono senza discussione.
  Leggi il commento in cima al file prima di toccarlo.

**Cosa serve davvero:** testi, traduzioni, accessibilità, difetti con i passi
per riprodurli.

**Cosa non entra, e non è un dibattito aperto:** pubblicità, sponsorizzazioni,
abbonamenti, «monetizzazione», token, integrazioni con servizi che tracciano le
persone, e qualunque cosa renda l'app più simile a un delivery. È il motivo per
cui il progetto esiste.

---

## Licenza

**AGPLv3.** Se prendi questo codice e ci costruisci un servizio, il tuo codice
deve essere pubblico come questo. Non è per proteggere noi: è perché la
prossima persona che vuole portare una birra a un vicino non debba
ricominciare da zero.

⚠️ **Il marchio non è nel patto.** Nome, logo, e tutto ciò che sta in `Brand/`
restano di Beer to Beer. Puoi forkare il codice; non puoi chiamarlo Beer to
Beer.

Sulla sicurezza e su cosa è pubblico per costruzione: **[SECURITY.md](SECURITY.md)**.

---

> PIÙ COMMUNITY, MENO ALGORITMI.
> PIÙ PERSONE, MENO PIATTAFORME.
> PIÙ BIRRA, MENO PROFITTO.

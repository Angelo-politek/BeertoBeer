# BtB V3 — piano operativo

> Documento di lavoro. Le checkbox si spuntano man mano.
> Il piano ragionato completo (contesto, motivazioni, verdetti di brand)
> comincia alla sezione **CONTESTO** più sotto: leggilo prima di toccare codice.

## STATO — aggiornato il 26/08/2026

**25 commit, 10 migrazioni, 369 test verdi.** Versione in circolazione:
**3.0.0-beta.2** (`constants/versione.ts`).

> **C6 è cominciato.** `constants/testi/` esiste, il contatore è in
> `glossario.test.ts`, e la soglia parla dai testi. Il rendiconto lo stampa
> `npm test`: **44 file su 103, ne mancano 59.** Il dettaglio è in
> «Ondata 1 · C6 · stato del cantiere», più sotto.

### Scudo beta — completo
- [x] **A1–A6** le sei correzioni SQL di sicurezza
- [x] **B1–B8** modello di stato, modale scorribile, profilo di chi porta,
      amici raggiungibili, changelog OTA, matrice annullamenti, stringhe che
      mentivano, scheda admin «Giri»

### Ondata 1 — 4 su 6
- [x] **C2** `ttl_giro()` + `orders.scade_il` + vista del feed ricostruita
- [x] **C3** tabella `uscite` + vista redatta + RPC + trigger guardia
- [x] **C5** pulizia del codice morto
- [x] **C6 (parziale)** riscritte le ~90 stringhe del **database**
      (`20260910_le_parole_delle_push.sql`). Per l'app: **scheletro
      `constants/testi/` + il contatore + S1 (la soglia)**. Vedi sotto.
- [ ] **C1** APK nuovo + `app_release` + ponte di runtime
- [ ] **C4** inbox unificata (vista `conversazioni`, `letture`, contatori)

### Ondata 2 — 4 su 5
- [x] **D1** tab FUORI + foglio a due tocchi + sezione in home
- [x] **D2** uscite sulla mappa + marker sovrapposti sparpagliati
- [x] **D3** `da_uscita_id` + avviso a chi si era reso disponibile
      *(la prelazione di 45 min è stata scartata: il perché è nel commento di
      `20260909_giro_da_uscita.sql`)*
- [x] **D4** morte di `smartScore` **e** `whyThisRequest`
- [ ] **D5** reputazione come fatti + catena degli inviti

### Ondata 3 — non cominciata
- [ ] **E1** «chi risponde» + registro pubblico
- [ ] **E2** IL PARI al centro
- [ ] **E3** ritaratura BeerCoin + tetto morbido
- [ ] **E4** IL QUADERNO
- [ ] **E5** apertura formale AGPLv3 *(repo già pubblico; manca `LICENSE`)*
- [ ] **E6** Milano: schermata di attesa, non lancio

### I due collaudi — 17 segnalazioni su 17, tutte chiuse
La più grave era una fuga di indirizzo introdotta con le uscite:
`reverseGeocode()` restituisce «Via Po 12, Torino», e finiva nel campo `zona`
che la vista pubblica a tutta la città. **La lezione, scritta per esteso in
`20260911_zona_non_e_un_indirizzo.sql`: la redazione non è una proprietà di una
colonna, è una proprietà del campo più loquace.**

---

## DECISIONI PRESE (25-26/08/2026)

1. **Repository pubblico.** `APK_URL` punta a `releases/latest`. La release non
   dev'essere «pre-release» e l'allegato deve chiamarsi esattamente
   `beer-to-beer.apk`.
2. **Sentry spento.** Il DSN era in chiaro e mandava i crash a un progetto a cui
   nessuno ha accesso, mentre i termini non lo nominavano. Si riaccende con
   `EXPO_PUBLIC_SENTRY_DSN` **e** una riga in `app/terms.tsx`.
3. **«PORTA. BEVI. RIPETI.»** sostituisce «CONSEGNA» nel manifesto. Registrata
   in `Brand/CORREZIONI.md`; il PDF va riesportato quando ci si rimette mano.

## DECISIONI DEL FONDATORE (26/08/2026) — chiudono i punti 4 e l'invito

**4 · «VIBE» RESTA.** La funzione andava bene nella versione precedente; il
difetto segnalato non era la funzione ma **il filtro**, ed era una corsa: i
filtri partono dai valori predefiniti e quelli salvati arrivano dopo da
AsyncStorage, che li scriveva sopra a qualunque scelta appena fatta. Chi
apriva l'app e toccava «Vibe mode» di fretta lo vedeva accendersi e spegnersi
da solo — mai aspettando un secondo, spesso avendo fretta. Corretto in
`lib/discovery.ts` (`filtriDopoIdratazione`), congelato da
`lib/__tests__/filtri-non-si-perdono.test.ts`, visto fallire apposta.
> Resta aperta la domanda di lingua sulla parola «vibe» — ma è un'altra cosa
> dal difetto, e la funzione non si tocca.

**L'invito non ha prezzo, e il premio è a valle.** Darlo **non costa niente,
nemmeno un BeerCoin**. Quando chi è entrato **conclude il suo primo giro**,
il premio va **a entrambi**. Non alla registrazione: iscriversi non è entrare
nella community, portare sì.

> ⚠️ **E qui c'è una discrepanza da sanare, che vale un giro in SQL.**
> Il fondatore ricorda **5 per parte**, ed è esatto per
> `20260824_inviti.sql:215`. Ma quella definizione è **soppressa**:
> `20260827_economia_e_diagnostica.sql:123` ridefinisce la stessa funzione con
> `v_premio constant int := 3` e il commento «Premio invito: da 5 a 3 per
> parte». **Per Postgres vale l'ultima: oggi in produzione ne arrivano 3**, e
> `lib/credits.ts` che dice 3 è allineato — l'app non sta mentendo.
>
> Riportarlo a 5 è **una migrazione nuova, SQL prima e app dopo** (regola 1).
> Cambiare solo `lib/credits.ts` farebbe promettere 5 a `app/invite.tsx`
> mentre ne arrivano 3, cioè creerebbe la bugia che si voleva togliere.
> `formula-crediti.test.ts` ora legge **l'ultima** definizione e cade da solo
> il giorno in cui il SQL cambia senza l'app.

## DA FARE, E NON PUÒ FARLO UN AGENTE

- **`LICENSE` manca.** Il README dichiara AGPLv3 e il repo è pubblico: allo
  stato attuale il codice è *tutti i diritti riservati*, cioè il contrario di
  quello che c'è scritto. Da GitHub: *Add file → Create new file → `LICENSE` →
  Choose a license template → GNU AGPL v3.0*. Poi la riga che esclude il
  marchio (nome, logo, `Brand/`), o un fork può chiamarsi Beer to Beer.
- **Il contatto in `SECURITY.md`** rimanda al profilo GitHub: se lì non c'è
  un'email pubblica, va messa.

---


## Contesto

L'app funziona ed è stata collaudata su tre telefoni con consegne, interazioni e segnalazioni vere. Ne sono usciti 7 feedback. Servono due cose in sequenza: mandare la beta a 20-30 persone senza che i difetti già noti mangino la prima settimana, e costruire in tre mesi una V3 che concretizzi la visione dei fondatori.

**La diagnosi che ordina tutto.** Oggi `orders` è il centro di gravità, e non in senso metaforico: il layer sociale è imbullonato con una foreign key. `pair_allowed` (`supabase/schema.sql:436-444`) richiede un giro confermato in comune per permettere un messaggio; la reputazione nasce solo da `reviews`, che nascono solo da ordini; i BeerCoin si muovono solo alla conferma di un ordine. **Una community in cui l'unico modo di diventare qualcuno è aver completato una transazione è un marketplace con una chat.**

La brand bible dice il contrario, ed è il documento che vincola la V3: *«non è un servizio di delivery, non è una startup… una community open source»*, con la mission **PIÙ COMMUNITY, MENO ALGORITMI · PIÙ PERSONE, MENO PIATTAFORME · PIÙ BIRRA, MENO PROFITTO.**

---

## Come è stato prodotto questo piano

Sette agenti, in tre ondate. **Ricognizione**: tre agenti hanno mappato il flusso giri/sicurezza/admin, il layer sociale e la navigazione, e censito le ~394 stringhe dell'app. **Progettazione**: quattro agenti in parallelo — uno per mese più uno dedicato alla comunicazione, che ha nominato gli oggetti nuovi prima che qualcuno li disegnasse. **Revisione**: il custode del brand ha giudicato ogni decisione contro la bible, risolto cinque conflitti fra i piani e trovato dieci cose fuori marchio che nessuno degli altri aveva visto.

I quattro sotto-piani integrali (296 KB) restano su disco in `…/tool-results/`. Quello che segue è la sintesi eseguibile.

## Decisioni prese

| | |
|---|---|
| **Beta** | Scudo prima (~1 settimana), poi i 20-30 inviti |
| **Tesi V3** | L'offerta al centro. Fiducia e auto-governo diventano conseguenze nelle ondate 2 e 3 |
| **Fonti di verità** | `Brand/fontbeer/brandbible_btb.pdf` + `README.spec.md`. Nessuna estrapolazione oltre |
| **Capacità** | Una persona quasi a tempo pieno → tre ondate da 4 settimane, seconda città inclusa come verifica |

---

# Parte 1 — Scudo beta (settimana 0)

Due treni di rilascio che non si sincronizzano: l'**SQL** è istantaneo e globale, l'**OTA** arriva alla prossima apertura. Quindi **sempre SQL prima, app dopo**. Nessun APK durante lo Scudo: costruirne uno significa spendere il budget di rischio più alto (installazione manuale, «origine sconosciuta», 30 persone che rifanno tutto) per zero benefici.

> ⚠️ **Lo Scudo non è ancora nel tree.** Sul branch `fix/beta-hardening` (`59a4e1e`) non esistono `annulla_giro_mio`, la finestra di 12h dentro `committed_credits`, `verify_delivery_code` che guarda `expires_at`, la tab Persone, il changelog OTA. Il nome della migrazione dello Scudo va fissato subito: tre interventi dell'Ondata 1 la rigenerano e i test la leggono per nome.

### Corsia A — SQL (attivo subito, aiuta anche chi resta indietro con l'OTA)

**A1 · Spegnere la doppia moderazione.** `handle_new_report` (`supabase/schema.sql:843-879`) oscura il giro, **sospende automaticamente 48h l'host** e manda una push agli admin; poi `segnala_problema_giro` (`20260902_segnalazioni.sql:170`) rifà la sua parte. Doppia notifica, regole incoerenti, e una persona in buona fede bloccata due giorni da una segnalazione sbagliata. Il trigger diventa no-op. **Oscuramento automatico del contenuto sì, sospensione automatica della persona mai.** *Prima cosa in assoluto: è l'unico difetto il cui danno cresce col numero di tester.*

**A2 · `pair_allowed` accetta anche gli amici.** Una riga: `or public.sono_amici(a, b)`. `sono_amici` (`20260905_persone.sql:153-161`) esiste ed è chiamata da nessuno; senza, il pulsante «Scrivi» di `app/amici.tsx:162` fallisce con un errore grezzo per chiunque non abbia già fatto un giro insieme. Miglior rapporto beneficio/sforzo del repository.

**A3 · La contabilità dei giri scaduti.** Niente `pg_cron`: **non costruire uno scheduler, correggere la contabilità.** `committed_credits` (`20260822_beta_hardening.sql:24`) e il tetto dei 3 aperti (`20260831_regole_e_limiti.sql:139-144`) smettono di contare i `richiesto` oltre le 12h. Oggi tre giri scaduti = utente bloccato per sempre coi BeerCoin congelati e nessun messaggio che lo spieghi.

**A4 · `verify_delivery_code` guarda `expires_at`** (`20260714_handshake_safety.sql:86-96`). `app/request/[id].tsx:488` promette già che il codice scade: oggi è una bugia. Trattare `expires_at is null` come valido, o si bloccano i giri in corso.

**A5 · `admin_cancel_order` diventa una chiusura vera.** Oggi mette solo `stato='annullato'`. Deve anche sgelare `congelato`, cancellare il codice, scrivere su `order_safety_events` e **avvisare entrambe le parti con `avvisa`**. È quest'ultima cosa che rende sopportabile il feedback #5 *prima ancora* dell'OTA.

**A6 · `annulla_giro_mio` pubblicata, policy DELETE NON revocata.** `cancelOrder` (`data/api.ts:693-696`) è una `delete()` fisica: distrugge statistiche e prove. Si pubblica la RPC ora; la revoca avviene **settimane dopo** (R3).

### Corsia B — OTA (solo bundle, nessuna dipendenza nativa nuova)

**B1 · Il modello di stato si completa. Prima di tutto il resto.** `congelato` entra in `ORDER_COLUMNS` (`data/api.ts:48-50`), in `mapOrder`, in `BeerRequest` — e soprattutto in **`nextOrderAction`** (`lib/discovery.ts:41-54`), insieme a `statoModerazione` (già nel tipo, mai letto lì) e `isExpired` (`lib/orders.ts:23`, scritto e mai usato lì).
> Chiude i feedback **#5** e **#6** e il banner fantasma della home (`app/(tabs)/index.tsx:88-92`) in un colpo solo, perché home, `my-orders` e dettaglio leggono tutti da lì.

**B2 · `report-modal.tsx` diventa un foglio scorribile** (feedback **#1**). `components/report-modal.tsx:84-107` ha `justifyContent:'center'`, nessun `maxHeight`, nessun `ScrollView`: il foglio deborda e «Invia» esce dallo schermo. Il pattern corretto è già in casa **due volte** — `testo-modal.tsx:60-93` e `provvedimento-modal.tsx:47-118`. Da estrarre come `<FoglioModale>`. *Primo OTA: un tester che il primo giorno non riesce a premere «Invia» non ti racconta il resto.*

**B3 · Il profilo di chi porta** (feedback **#7**). `withHosts` (`data/api.ts:233-236`) risolve solo gli host: basta passare anche i `driver_id` a `fetchProfiles`, che fa già una query batch. Costo query: zero. *È il buco più grave: l'host non sa chi sta arrivando a casa sua.*

**B4 · Gli amici diventano raggiungibili** (feedback **#3**). Oggi la lista è a 3 tap dentro Impostazioni → card «Sicurezza» (`app/settings.tsx:31`), unico link in tutto il repo; `app/connections.tsx` è orfana totale e già duplicata in `app/amici.tsx:190-211` → si cancella.
> ⚠️ **Non si aggiunge una tab adesso.** Il custode ha respinto le 5 tab (§ Contratto C2): la struttura definitiva è a **quattro**, e arriva nell'Ondata 2 quando la tab centrale ha un contenuto. Per lo Scudo: gli amici salgono in cima al Profilo e `community.tsx` esce da `href: null`.

**B5 · Il changelog dell'OTA** (feedback **#4**). `app/_layout.tsx:226-239` fa `checkForUpdateAsync` → `fetchUpdateAsync` → `reloadAsync()` in silenzio, potenzialmente mentre stai scrivendo a chi ti sta portando le birre. `reloadAsync` distrugge lo stato React: l'`updateId` va scritto su AsyncStorage **prima** del reload e riletto al boot successivo — stessa ragione per cui esiste `lib/onboarding-signal.ts`. **Guardia:** condizionato all'esistenza di un `updateId` precedente, o il changelog si presenta a chi ha appena installato.

**B6 · La matrice degli annullamenti si chiude.** Oggi l'host **non può** annullare un giro `accettato` (deve aspettare 24h) e nessuno può chiudere un `consegnato`. Gate SQL da allargare prima: **B dopo A**.

**B7 · Le stringhe che mentono.** `WELCOME_TOKENS=10` contro SQL; `REFERRAL_TOKENS=5` contro `lib/credits.ts:86` che dice 3 mentre **il database conia 5+5** (`20260824_inviti.sql:215-216`); `APK_URL` congelato su `v1.1.0-beta1`; le 18 stringhe senza accenti. *Un tester che legge «+5 BeerCoin» e ne riceve 3 conclude che l'app mente, e da quel momento non si fida di nessun numero.*

**B8 · La scheda «Giri» del pannello** (feedback **#2**). `app/admin/giri.tsx` riusa `adminGetActiveOrders` (`data/api.ts:1753`) come elenco e **`adminCancelOrder`** (`data/api.ts:1746`, esistente e importata da nessuna schermata) come azione. E `safety-map.tsx`: camera sulla città invece che fissa sull'Italia a zoom 5, congelati in evidenza.

### Ordine di rilascio

| Quando | Cosa | Canale |
|---|---|---|
| Giorno 1 | A1 → A5, pubblicazione (non applicazione) di A6 | SQL, subito attivo |
| Giorni 2-4 | B1 + B2 + B3 — *la correttezza* | `eas update --channel preview --platform android` |
| Giorni 5-7 | B4 + B5 + B6 + B7 + B8 — *la navigazione e l'onestà* | OTA #2, il primo che si annuncia da solo |
| Giorno 8 | Si mandano i 20-30 inviti | — |

I tester installano l'APK da GitHub e ricevono l'OTA alla prima apertura: entrambi gli aggiornamenti vanno pubblicati **prima** di distribuire il link.

---

# Parte 2 — Il contratto di brand

Deciso dal custode. **Vincola tutte e tre le ondate**: dove un sotto-piano diceva altro, vale quanto segue.

## La tesi

> **Il giro smette di essere il prodotto e diventa una delle forme in cui una persona si rende disponibile.** L'unità centrale non è l'ordine: è **l'uscita** — una persona, un quartiere, un paio d'ore. L'app smette di chiedere *«cosa ti serve?»* e comincia a chiedere *«cosa fai stasera, e a chi può servire?»*

Oggi l'app sa mostrare solo **domanda insoddisfatta**. Domanda senza offerta ha l'aspetto di un'app rotta; offerta senza domanda ha l'aspetto di una città viva. Con 30 persone a Torino, solo la seconda può essere vera al primo giorno.

## I cinque conflitti, risolti

**C1 · L'oggetto centrale: tabella `uscite`, tre facce, «disponibilità» muore.**
Non quattro facce: `incontro` ed `evento` **esistono già** come oggetto proprio (`events.tipo`, `20260905_persone.sql:26-29`, con locandina, partecipanti, chat) — duplicarli darebbe due case alla stessa cosa. E non `disponibilita` come nome: **`users.availability` esiste già** (`20260713_profile_customization.sql:4`) e significa «DI SOLITO CI SONO».
```
uscite(id, autore_id, citta, tipo, zona, finisce_alle, nota, stato, created_at)
tipo  check (tipo in ('negozio','birra','zona'))
stato check (stato in ('aperta','chiusa','scaduta'))
finisce_alle timestamptz NOT NULL   -- senza, «Chi finisce prima» non ha dati
```
A schermo: oggetto **un'uscita** · stato **FUORI** · persona **chi è fuori** · forme **PASSO DAL NEGOZIO · BEVO UNA BIRRA · SONO IN ZONA** · dichiara **SONO FUORI** · ritira **NON CI VADO PIÙ**.

**C2 · La quarta tab non esiste. Le tab sono quattro: GIRI · MAPPA · FUORI · PROFILO.**
Passare da 3 a 5 in una release è il gesto di una piattaforma («PIÙ PERSONE, MENO PIATTAFORME»). E una tab «Persone» che contiene amici + richieste + scoperta + incontri + bacheca è un tuttofare: cinque cose scollegate dietro una parola. `community.tsx` resta la schermata che è, raggiunta da FUORI e da PROFILO.
**Icona della tab centrale: `cheers`** — già in `assets/brand/` e già montata (`brand-icon.tsx:11`). Il custode ha respinto la mano alzata: nel sistema di marchio **non esiste alcuna mano**, e una mano alzata è il pittogramma del volontariato. Il gesto di «sono fuori, venite a berne una» in questo marchio è il brindisi, che è anche il simbolo del logo. **Zero asset nuovi.**

**C3 · Il ledger si chiama IL QUADERNO.** «Libro mastro» è italiano da partita doppia — bible, MAI: corporate. Un quaderno è quello dietro il bancone del bar. `public.quaderno()`, `app/quaderno.tsx`, `/quaderno`. Costo del rename: **zero**, non esiste ancora niente.

**C4 · Nessuna push automatica sulle uscite.** Una push che l'app manda perché ha giudicato il feed troppo silenzioso **è** l'algoritmo, vestito da notifica. Ma la diagnosi dell'Ondata 2 è giusta — dichiarazioni invisibili uccidono il ciclo — e la risposta è **la mappa e la tab FUORI**, più una notifica che la persona **accende per il proprio quartiere**: interruttore per città e fascia in `notification-settings.tsx`, **spento di default**, massimo una al giorno con `dedupe_key`. Chi la accende ha scelto: è «Locale», non *engagement*.

**C5 · Il rating esce dallo schermo E dal cancello.** `puo_rispondere()` **non deve leggere `rating_medio`**: se il numero non si può mostrare, non può nemmeno distribuire il potere — sarebbe l'unico algoritmo nascosto, per giunta su una pagina che si chiama registro pubblico. Cancello sostitutivo, ogni clausola pubblicata su `/registro`: **8+ giri conclusi · 60 giorni dall'iscrizione · zero provvedimenti · nessuna segnalazione grave a proprio carico · invitato da qualcuno ancora dentro · conferma di chi risponde già in quella città.**

## Il glossario definitivo

| Parola ufficiale | Dove | Vietato |
|---|---|---|
| **giro / giri · Lancia un giro** | l'oggetto della portata | consegna, delivery, ordine, richiesta *(come oggetto)* |
| **chi chiede / chi porta** | i due ruoli | utente, driver, rider, fattorino, host |
| **un'uscita / le uscite** | l'oggetto nuovo | disponibilità, availability, slot, annuncio, stato |
| **FUORI · chi è fuori** | stato e tab centrale | Online, Attivo, Disponibile ora, Live, In giro |
| **SONO FUORI / NON CI VADO PIÙ** | i due soli tasti in prima persona | Renditi disponibile, Attiva stato |
| **BeerCoin / BC** | il gettone, sempre | crediti, punti, PT, valuta |
| **Presi / Spesi** | movimenti del portafoglio | Entrate, Uscite, Transazioni, Bilancio |
| **restituito alla città** | l'eccedenza oltre 30 | donazione, cashback, bonus, premio |
| **IL PARI · Hai portato / Hai ricevuto** | reciprocità, primo dato del profilo | karma, punteggio, reputazione, score, livello |
| **12 giri conclusi · Puntuale in 7 su 8 · Invitato da X** | i fatti al posto della cifra | 4,7 · ⭐ · «affidabile» · «top» · percentuali |
| **Chi finisce prima · Più vicini · Appena arrivati** | i tre ordinamenti | Per te, Consigliati, Rilevanza, Smart, Popolari |
| **IL QUADERNO** | `/quaderno` | libro mastro, bilancio, dashboard, statistiche |
| **IL REGISTRO** | `/registro` | audit log, trasparenza report |
| **IL CITOFONO · CHI RISPONDE** | il canale della moderazione | supporto, assistenza, ticket, staff, moderatore |
| **invito** | il cancello d'ingresso, **senza prezzo** | referral, codice promo, invita e guadagna |
| **beta** | detta ad alta voce nell'onboarding | early access, lancio ufficiale |

## Le regole della voce

**«tu», sempre.** Due eccezioni con criterio: «si» impersonale solo per **enunciare una regola del mondo** («Si entra solo su invito» ✓ / «Si può annullare» ✗ → «Puoi annullare»); «voi» solo quando il soggetto sono **davvero le due persone del giro**. **«noi» si elimina** — in `app/terms.tsx` il soggetto diventa *Beer to Beer*, nominato: un «noi» in un documento legale evoca una società che qui non c'è. **«io» si elimina**: se l'app dice «non riesco», l'app diventa un personaggio, e un personaggio che ti assiste è la mascotte da startup che la bible vieta. Unica eccezione: il tasto che dichiara qualcosa su di te parla con le tue parole.

**Il maiuscolo non si scrive mai nel sorgente.** `themed-text.tsx:83,90,108` e `button.tsx:76` lo applicano già. Le 47 stringhe maiuscole nel sorgente sembrano innocue e non lo sono: non arrivano nei posti senza foglio di stile (titolo di `Alert`, di una push, di `Share.share`), TalkBack le legge lettera per lettera, e **`app/review.tsx:107` passa il nome di una persona a `type="title"`** — il nome di chi hai appena incontrato compare in ALL CAPS. Serve un `type="nome"` nuovo, Bebas senza `textTransform`.

**Zero emoji, ovunque, push comprese.** Il fondamento non è il NEVER DO visivo (che copre solo le «emoji giganti») ma la regola ICONE: *«outline, bianco, 2-3px, disegnate a mano, mai glossy, 3D, gradient»* — un'emoji di sistema **è** un glifo glossy multicolore disegnato da qualcun altro, spedito dentro il nostro marchio. Da bonificare oltre alle push: `app/user/[id].tsx:245` (`⭐`), `app/admin/users.tsx:191`, `data/api.ts:769` (`'Nuovo livello ⬆️'`), `README.md:1` (`👋`). **`TOKEN_EMOJI` si cancella**, non si lascia a stringa vuota: una costante emoji vuota è una casella che aspetta.

**Punto esclamativo vietato nel copy.** Nessuno degli esempi ufficiali ne ha uno. L'unico strumento di volume è il maiuscolo in Bebas. **Il due punti è l'arma principale**: separa il fatto dall'azione in una riga sola.

**L'ironia sta nella scelta della parola, non in una battuta in fondo** — e **mai in un errore né in una conferma distruttiva**: chi sta perdendo qualcosa non vuole compagnia, vuole un'uscita.

## Le regole visive delle schermate nuove

Sfondo **solo** `c.background`. **Un accento, e solo sotto un dito**: `c.accent` esclusivamente sull'azione che si preme — mai su un numero, mai su un punteggio, mai su un badge (da correggere: `profile.tsx:95` e `:115`). Titoli Bebas maiuscoli, corpo Inter, **mai `fontWeight` con le famiglie statiche** (`theme.ts:167-170`: faux-bold su Android). Card senza ombra (`shadows().card` = 0). Ingressi **senza molle**, cascata massimo 3 (`Stagger.maxItems`). Icone: **solo `BrandIcon`**.

**Texture** — la bible ne chiede almeno una per composizione: vale per le schermate che sono dichiarazioni (onboarding, stato vuoto, testate di `/registro` e `/quaderno`), **mai dietro materiale da leggere**.

Vietati per schermata: **foglio dell'uscita** — indicatore di passo, illustrazione, coriandoli. **Mappa** — heatmap e overlay a gradiente (NEVER DO *e* vista di sorveglianza), poligoni precisi di una zona. **Registro** — `grafico-barre.tsx`: un grafico a barre della moderazione è un cruscotto, e il cruscotto è il registro delle aziende. **Quaderno** — podio, top-5, simboli di valuta, verde/rosso di andamento. **Chi risponde** — spunta verde, scudo, `c.positive`, titolo sul profilo.

---

# Parte 3 — Ondata 1 (mese 1): «Tempo, parole, una sola porta»

Rendere onesto ciò che c'è e costruire le fondamenta. **APK nuovo all'inizio.**

| Sett. | Cantiere | Perché qui |
|---|---|---|
| **1** | APK, ponte di runtime, misura del passaggio + i test sulle **viste** scritti *prima* di toccarne una | R6 è irreversibile: se il runtime si divide a fine mese, tre settimane di OTA vanno sul canale sbagliato |
| **2** | `finisce_alle`/`scade_il` + **un solo `drop view`** di `open_requests` + pulizia A | La vista è l'operazione più pericolosa del repo. Una volta sola, presto, con dentro già tutto ciò che serve all'Ondata 2 |
| **3** | **`uscite`** — tabella, vista redatta, RPC, trigger. **Nessuna UI** | L'unica cosa non tagliabile: l'Ondata 2 non parte senza |
| **4** | Inbox unificata + pulizia B + collaudo | La vittoria visibile, ed è quella con più parti scomponibili |

### C1 · APK e ponte di runtime

`app.json:4` (`version: "1.1.0"`) più `runtimeVersion.policy: "appVersion"` significa che **il runtime È la versione**: bumparla crea un secondo runtime, e i 30 telefoni smettono di ricevere aggiornamenti **in silenzio, senza errore**.

> **L'idea portante: l'unico canale che raggiunge entrambi i runtime è il database.** Tabella `app_release(canale, versione, apk_url, minima, titolo, messaggio)`, leggibile da `authenticated`, scritta solo dal SQL Editor. Così, anche dopo il bump, testo, link e severità del messaggio «aggiorna» si cambiano senza poter più mandare OTA a `1.1.0`.

**La misura**: `push_tokens` acquista `app_version`, `runtime_version`, `visto_il` — la scrive `savePushToken` (`data/api.ts:990-997`), chiamata a ogni avvio. Più `admin_parco_telefoni()`. Senza, «far reinstallare 30 persone» è cieco.
> Bug da correggere insieme: `data/api.ts:1736` scrive `app_version: 'V2.1'` **hardcoded** in `product_feedback`. Ogni feedback della beta è etichettato con una versione falsa.

**L'ordine è tutto il cantiere.** ① migrazione `app_release` → ② **OTA sul runtime 1.1.0** con banner, `lib/versione.ts`, riga versione in Impostazioni, `savePushToken` esteso ← *passo irreversibile: se parte dopo il bump, i 30 non sapranno mai di dover aggiornare* → ③ Sentry (`eas secret`, `organization`/`project` nel plugin — oggi `app.json:47` è **senza opzioni**, togliere `SENTRY_DISABLE_AUTO_UPLOAD` da solo fa fallire la build o salta l'upload in silenzio) → ④ bump `version` → ⑤ build → ⑥ Release **non pre-release**, asset nominato esattamente `beer-to-beer.apk` → ⑦ fotografia di partenza → ⑧ push a tutti + messaggio ai tester.

**Far reinstallare senza perdere metà delle persone.** La frase che conta di più è **«si installa sopra»**: stesso package, stesso keystore → Android aggiorna in loco e non si perde niente. La paura di perdere l'account è il primo motivo per non farlo. ⚠️ Verificare con `eas credentials` che il keystore non venga rigenerato. Tre canali (banner dal DB, push via `avvisa`, messaggio nel gruppo), rilascio **giovedì sera**, sollecito **lunedì solo a chi risulta indietro**.
> **Decisione del fondatore, settimana 1**: `releases/latest/download/beer-to-beer.apk` funziona **solo con repository pubblico** (`constants/branding.ts:68-75` lo documenta). Piano B: bucket Supabase (165 MB × 30 ≈ 5 GB = tutta la banda mensile del piano gratuito — praticabile una volta). Piano C: link esterno in `app_release.apk_url`, che esiste apposta.

### C2 · Il TTL in un posto solo

Oggi le 12 ore stanno in **quattro** posti, non tre: `open_requests`, `lib/orders.ts:20-25`, **`admin_dashboard_stats` (`schema.sql:1065`)** e la contabilità dello Scudo. Si crea `public.ttl_giro()` e ci si legge da lì. `orders.scade_il` arriva come **default di colonna**, non come trigger: `set_order_credits` è la funzione più densa di guardie dello schema e ridefinirla per aggiungere una riga è precisamente lo scenario R5.

**Un solo `drop view` in tutto il mese**, con dentro già `scade_il`, `congelato` e `da_uscita_id` — così l'Ondata 2 non deve rifarlo. E il test che lo protegge scritto **prima**.

### C3 · `uscite` — il contratto

**Nessuna UI.** Nomi di colonne e firme RPC sono un contratto: l'Ondata 2 ci costruisce sopra e non potrà rinegoziarli senza rompere ciò che nel frattempo esiste.

Tre regole, tutte copiate da ciò che qui già funziona: **vista redatta** `uscite_aperte` con la stessa forma di `open_requests` (coordinate arrotondate a 2 decimali, `pair_blocked`, TTL nella `where`); **`finisce_alle` NOT NULL** con tetto a 6 ore (*«più a lungo non è una serata: è la tua posizione pubblicata»*); **`guardie_uscite`** gemello di `guardie_giro` (`20260902_segnalazioni.sql:129-162`) — congelamento e sospensione valgono dal primo giorno, non ci sarà mai un momento in cui un'uscita esiste e queste due regole no.

Quattro RPC e basta: `apri_uscita`, `chiudi_uscita`, `proroga_uscita`, `admin_uscita`. Il feed lo dà la vista, i profili `withHosts`, la distanza `haversineKm`. **Ogni RPC non scritta è una firma che l'Ondata 2 non deve rispettare.**

### C4 · Inbox unificata

Oggi tre tipi di chat, tre porte, **nessun elenco**. E tre difetti: `event_messages` non chiama mai `avvisa` (**la chat di gruppo non avvisa nessuno**), non è nella publication realtime (`app/chat/evento/[id].tsx:71` ricarica tutto a ogni invio), e `app/(tabs)/index.tsx:71` scarica **80 righe** di notifiche a ogni focus della Home per contarne le non lette.

Vista SQL `conversazioni` (union dei tre, con ultimo messaggio e non letti) + tabella `letture` per conversazione + `contatori_non_letti()`.
> ⚠️ **La vista bypassa la RLS** come `open_requests` e `public_profiles`: **ogni ramo del union deve filtrare su `auth.uid()` a mano.** È il punto in cui un errore diventa una fuga di conversazioni altrui, ed è la cosa da rileggere due volte prima di applicare.

**Decisione:** le chat usano `push_to_users`, **non `avvisa`** — non finiscono in `notification_inbox`. La casella è per le cose che succedono, l'elenco messaggi per le cose che si dicono. Mandarcele farebbe contare due volte la stessa cosa.

### C5 · Pulizia (prima che l'Ondata 2 ci costruisca sopra)

**Lo stato `consegnato`**: nessun percorso vivo lo produce più (`verify_delivery_code` salta da `arrivato` a `confermato`). Si cancella `confirmOrder` da `data/api.ts` e il pulsante da `request/[id].tsx`. **Non si tocca mai**: `OrderStatus`, `STATO_LABEL`, `ORDER_TIMELINE`, il vincolo `orders_stato_chk`, e la policy `messages_insert_participants` — togliere `'consegnato'` da lì bloccherebbe la chat su un giro storico, che è **esattamente** il bug corretto il 24 agosto.

**Codice morto verificato uno per uno**: `badge-grid.tsx`, `level-badge.tsx` (stampa «Community» su ogni profilo del mondo), `LEVELS`, `BADGES`, `getUserBadges`, `getLeaderboard`, `getZoneHolders`, `claimUrbanMission`, `applyReferral`.
> ⚠️ **`getBlockedUsers` non si cancella: si collega.** Oggi `blockUser` è raggiungibile solo da `app/user/[id].tsx`; se blocchi qualcuno e non ritrovi il suo profilo, **il blocco è irreversibile dall'app**. Cancellare la funzione fotografa il difetto invece di curarlo. Sezione «Persone bloccate» in Impostazioni, ~30 righe. *È il promemoria che «senza consumatori» a volte significa «manca la schermata».*

### C6 · Le parole (agente `la-voce`, in parallelo)

**`constants/testi/` — una cartella di 9 file da ~150 righe, non un file da 400.** Un file solo con 394 stringhe è un file che nessuno riapre, e in un'ondata con più cantieri in parallelo è un conflitto di merge garantito. Divisione per **area di prodotto** (`parole`, `voce`, `ingresso`, `giro`, `fuori`, `persone`, `sistema`, `admin`), non per schermata.

Tre regole di forma: `as const` con chiavi che nominano la cosa; **se un valore entra nel testo, la voce è una funzione** (oggi `index.tsx:163` compone una frase con un `toLowerCase()`); **i numeri non si scrivono nei testi**, arrivano come parametro da `lib/credits.ts`/`lib/limiti.ts`.

**`glossario.test.ts` passa da 3 controlli a 7.** Il più importante è il **#2, che è il contatore della migrazione**: fallisce se una schermata contiene testo italiano fuori da `testi/`, e parte con una lista di deroghe che contiene **tutti e 50 i file**, da svuotare una riga alla settimana. Quando la lista è vuota il lavoro è finito. Nessun altro rendiconto serve.

> **Più forte di un test: il compilatore.** Rendere `actionLabel` e `onAction` **obbligatorie** in `components/empty-state.tsx` trasforma i 18 vicoli ciechi in 18 errori di TypeScript da sistemare in un commit solo. Il commento alle righe 17-21 spiega già perché servono — ma un commento non compila.
> ⚠️ **Verificato il 26/08: i vicoli ciechi sono 22, non 18** — su 32 usi
> totali di `EmptyState`. Due dei 22 stanno in `app/connections.tsx`, che il
> piano dice di cancellare (B4): vanno via da soli.

### C6 · stato del cantiere *(aggiornato il 26/08/2026)*

**Fatto.**
- `constants/testi/` con `index` · `parole` · `voce` · `ingresso`. Le cinque
  aree restanti (`giro`, `fuori`, `persone`, `sistema`, `admin`) sono
  **prenotate per nome nell'intestazione di `index.ts` ma non create vuote**:
  un `export const {} as const` è «una casella che aspetta», lo stesso motivo
  per cui `TOKEN_EMOJI` è stato cancellato invece che svuotato.
- **Il contatore** (`glossario.test.ts`, controllo #2). Stampa una riga a ogni
  `npm test`. È stato **visto fallire apposta in tutte e due le direzioni**:
  rimettendo una frase italiana in un file già pulito, e lasciando in lista una
  deroga che non serve più.
- **S1 · la soglia**: `app/(auth)/` per intero (accesso, registrazione,
  password dimenticata, nuova password, conferma email) e `lib/auth-errors.ts`.

> ⚠️ **Il perimetro del contatore è più largo di «le schermate».** Il piano
> diceva 50 file, cioè `app/`. Sorvegliare solo le schermate però permette di
> spostare una frase in `components/` e vedere il contatore avanzare **senza
> aver riscritto niente**, che è il fallimento che il contatore esiste per
> impedire. Sorvegliati: `app/` e `components/` per intero (un file nuovo entra
> da solo) più un elenco esplicito di `lib/` e `constants/`. Totale **104**.
> Non era teorico: `lib/auth-errors.ts` teneva 18 frasi lette a schermo ed è
> proprio il file che S1 doveva ristrutturare.

**Tre difetti trovati riscrivendo, e corretti.**
1. **`app/(auth)/login.tsx` mentiva su ogni fallimento.** Scriveva a mano
   «Email o password non corretti» per *qualunque* causa: chi non aveva ancora
   confermato l'email si sentiva dire che la password era sbagliata, la
   cambiava, e falliva di nuovo. `messaggioAuth` esisteva già ed era usata
   dalle altre tre schermate della soglia, ma non da questa.
2. **`app/(auth)/reset-password.tsx` buttava via l'errore del server** e
   diceva «Non siamo riusciti ad aggiornare la password» — un «noi» che evoca
   una società inesistente, al posto del motivo vero.
3. **Il gate 18+ non era davvero coperto da un test.** `esaminaData(input,
   oggi)` usava `oggi` solo per scartare le date future: l'età la chiedeva a
   `computeAge`, che leggeva `new Date()` per conto suo. I due casi di confine
   passavano **solo nelle giornate in cui la data finta del test coincideva con
   quella vera della macchina**, e il 26/08 hanno cominciato a fallire da soli.
   `computeAge` ora accetta la data, e il test ne fissa una lontana da
   qualunque «oggi».

**S1 è chiusa.** Onboarding e invito erano bloccati dalle due decisioni del
fondatore, prese il 26/08 (vedi in cima), e sono entrati subito dopo.
L'onboarding ha acquistato le due cose che il piano chiedeva: **che riceverai
un invito da spendere** (slide nuova, zero asset: icona `profile`) e **che
questa è una beta** — quest'ultima sull'ultima schermata e non su una slide
sua, perché il momento in cui serve è quello immediatamente prima del feed.

> ⚠️ La riga della beta non è quella del piano alla lettera. Il piano scriveva
> «Siamo pochi, ed è normale: certe sere il feed è vuoto»; «siamo» è un «noi»,
> che la regola della voce elimina. Vale «Certe sere il feed è vuoto, ed è
> normale: qui si comincia adesso» — il «si» impersonale è ammesso perché
> **enuncia una regola del mondo**, che è l'unica eccezione prevista.

**S2 · il giro, cominciata.** Fatto il **vocabolario condiviso**, che è la
parte che valeva la pena fare per prima: `STATO_LABEL`, i motivi per cui un
giro è fermo e le dodici etichette di `nextOrderAction` stavano dentro
`lib/orders.ts` e `lib/discovery.ts` — due file di logica — pur essendo testo
letto a schermo da home, dettaglio e «I miei giri» insieme. Ora stanno in
`constants/testi/giro.ts`, dove si rileggono di fila. Più `my-orders.tsx` e
`review.tsx`.

**S2 è chiusa**: più `create-request.tsx`, **`request/[id].tsx` (875 righe,
84 frasi)** e le tre chat.

> ⚠️ **`request/[id].tsx` era la schermata più fuori glossario dell'app, e non
> per caso: è cresciuta a strati.** Diceva **«host»**, **«consegna»** e
> **«richiesta»** come oggetto, **«crediti»**; parlava in prima persona due
> volte («Non riesco a inviare la tua posizione», «Preparo il link…»); diceva
> «Verifichiamo» al plurale maiestatis; aveva un punto esclamativo («Buona
> birra!») e **tre parole senza accento — «Finche», «cosi», «puo» — nella
> banda che compare quando un giro è fermo**, cioè nel punto in cui una
> persona è già in ansia.
>
> Adesso c'è una guardia che impedisce alle parole vietate di rientrare in
> `testi/`, ed è stata vista fallire apposta. ⚠️ Con un'eccezione dichiarata:
> **«non è un delivery» non è un'infrazione, è il marchio** — la VISION della
> bible comincia proprio così. Il glossario vieta di *chiamare* un giro
> «delivery», non di nominare la cosa che il progetto dichiara di non essere.

> 📌 **Da segnalare per D5**: la lista del piano («via il numero da
> `user/[id].tsx`, `request-card.tsx`, `feed-map.tsx`») **è incompleta**.
> Anche `app/request/[id].tsx` mostra `ratingMedio.toFixed(1)} su 5` sul
> profilo di chi ha lanciato il giro. Non l'ho tolto qui: D5 è una voce a sé,
> e toglierlo da un posto solo lascerebbe l'app a metà.

**Due difetti corretti passando:** `motivoNonAgibile` diceva «una segnalazione
**e** in verifica», senza accento (una delle 18 stringhe senza accenti che il
piano elencava); e `review.tsx` passava il nome di chi hai appena incontrato a
`type="title"`, che è maiuscolo — la schermata in cui racconti com'è andato uno
scambio ti urlava addosso il nome della persona. Esiste ora `type="nome"`,
Bebas senza `textTransform`, con la sua guardia.

**Le quattro emoji vere nel sorgente** (le altre 15 occorrenze trovate sono
segni tipografici monocromatici — `→ ✓ ★ ▾` — che prendono il colore del testo
e non sono glifi glossy disegnati da altri): `app/user/[id].tsx:243` e
`app/admin/users.tsx:191` (`⭐`, muoiono con **D5**), `data/api.ts:793`
(`'Nuovo livello ⬆️'`) e `components/location-field.tsx:193` (`📍`).

**La sequenza:** settimana 0 lo scheletro + **le push, tutte, in una migrazione sola** (nessuna app le legge: non c'è convivenza da gestire, ed è il testo che pesa di più) → S1 la soglia (login, registrazione, onboarding, invito) → S2 il giro → S3 le persone e il sistema → S4 chiusura e rilettura in fila su un telefono vero.
**Regola che governa tutto: nessuna stringa entra in `testi/` senza essere stata riscritta.** Spostare 394 stringhe brutte dentro un dizionario le congela per due anni.

**In blocco** (4 commit meccanici, resa a schermo invariata): il maiuscolo fuori dal sorgente · accenti e apostrofi · gli `Alert` distruttivi senza `cancel` · le 5 `errorMessage()` locali → `messaggioServer`. **A mano**: tutto il resto, compreso `driver` → `chi porta`, perché la differenza fra un letterale e `driver_id` la vede una persona, non una regex.

> ⚠️ **Trappola vera, non teorica:** `lib/auth-errors.ts:18` fa `if (t.includes('invito')) return grezzo`. Se una migrazione riscrive il messaggio d'errore dell'invito togliendo quella parola, l'app mostra «Registrazione non riuscita» proprio dove doveva dire *quale* problema c'è col codice. Nessun test lo prende. **Correzione strutturale in S1**: il database solleva con prefisso stabile `BTB:invito_non_valido:` e `messaggioServer` riconosce il codice, non la parola.

**Il messaggio d'invito** — l'unico testo che circola fuori dall'app, oggi senza nome di chi invita né di chi riceve, con «community di Torino» hardcoded e nessun modo di copiare il codice:
```
{Nome}, ti porto dentro Beer to Beer.

È una community di {Città}: ci si porta le birre a vicenda fra chi abita
vicino. Nessuno ci guadagna niente. Chi porta si fa rimborsare la spesa e
prende BeerCoin, che valgono solo qui dentro e non diventano soldi.

Si entra solo su invito e ognuno ne ha uno. Il mio l'ho dato a te.

Il tuo codice: {CODICE}
L'app: {link}

— {Mittente}
```
Più il campo **«A chi lo dai?»**: non è un abbellimento, **fa fermare a pensare chi sta per spendere l'unico invito che ha**. E `Clipboard.setString` da `react-native` funziona oggi in RN 0.81: «Copia il codice» senza dipendenze e senza APK.

**L'onboarding acquista due cose che non ha mai avuto**: che riceverai un invito da spendere («Uno solo, ed è tuo… prenditi il tempo di scegliere»), e che questa è una beta («Siamo pochi, ed è normale: certe sere il feed è vuoto»). Chi entra su invito e trova un feed vuoto pensa che l'app sia rotta. Tre righe, e salvano metà delle prime impressioni.

### Definition of done — giorno 30

Riga versione in Impostazioni · **almeno 20 dei 30 tester su `1.2.0`** (`admin_parco_telefoni()`) · un crash volontario su Sentry **con file e riga** · il link d'invito scaricabile **in incognito** · «Scade fra 12 h» che scende davvero · `count(open_requests)` = card sul telefono = `admin_dashboard_stats.richieste_aperte` (oggi possono divergere) · `apri_uscita` rifiutata fuori città, da sospeso, e con due già aperte · un'uscita congelata **sparisce** e non si riapre · tre giri scaduti non bloccano il quarto · **un elenco unico** delle tre chat con non letti che calano e restano calati · due account in un incontro: push **e** messaggio senza ricaricare · niente più «Community» sotto ogni nome · `npm test` verde **e `viste-non-perdono-colonne` verificato rompendolo apposta** (*un test-guardia che non si è mai visto fallire non si sa se funziona*) · migrazioni **rieseguite due volte** senza differenze.

### Cosa si taglia, in ordine
Persone bloccate (0,5 g) → scadenza scegliibile dall'host (1 g) → `admin_parco_telefoni` **ma non la colonna `app_version`** (0,5 g) → push della chat di gruppo, **il realtime no**: costa due righe (1 g) → blocco messaggi nel profilo (0,5 g) → `subscribeToEventMessages` (0,5 g) → anteprima nell'elenco (0,5 g) → **la schermata `chat/index.tsx` intera** (2 g), che lascia comunque vista, letture, contatori e la Home che non scarica più 80 righe.
**Non si taglia mai**: `uscite` completa · `da_uscita_id` dentro `open_requests` (aggiungerla dopo = un secondo `drop view`) · `ttl_giro()` · `viste-non-perdono-colonne` · il glossario esteso · il ponte di runtime.

---

# Parte 4 — Ondata 2 (mese 2): «Chi è fuori»

L'ondata in cui l'app smette di essere un delivery. **Seconda e non prima** perché senza il modello del tempo, senza una voce sola e senza un'inbox sola sarebbe un disastro sopra un disastro.

| Sett. | Cosa |
|---|---|
| **1** | Tab centrale + foglio + elenco. Unico cantiere senza dipendenze, e produce **il dato** su cui poggiano gli altri quattro |
| **2** | Mappa a livelli + `da_uscita_id` + morte di `smartScore`. Da adesso ci sono due elenchi da ordinare: la decisione si prende una volta sola |
| **3** | Le persone e la reputazione come fatti. Dopo aver deciso l'ordinamento, o si riscrive due volte |
| **4** | Test, casi limite, due telefoni veri, testi. +2 giorni di margine |

Punti di non ritorno: fine S1 si dichiara e si legge; fine S2 si risponde a un'uscita con un giro; fine S3 le persone si vedono. **Fermarsi a fine S2 lascia comunque un prodotto coerente.**

### Il foglio: 2 tocchi, 15 secondi

`app/create-request.tsx` è il **contro-esempio**, e va guardato per quello che ammette di essere: una schermata così lunga da aver bisogno di **una bozza persistita con debounce** (`:78-96`). *Salvare una bozza è la confessione che compilare è un lavoro.* Il foglio non salva bozze, e un test lo verifica.

```
┌──────────────────────────────────────────┐
│  STASERA                                 │
│  CI SEI?                                 │
│                                          │
│  [ Passo dal negozio ]  ← Chip attivo    │
│  [ Bevo una birra ]   [ Sono in zona ]   │
│                                          │
│  fino alle  [21] [22] [23] [all'una]     │
│                                          │
│  San Salvario · dal tuo telefono         │
│  Aggiungi due parole (facoltativo)       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │            SONO FUORI              │  │
│  └────────────────────────────────────┘  │
│  Si chiude da sola alle 23. Puoi         │
│  rientrare quando vuoi.                  │
└──────────────────────────────────────────┘
```

**Perché sono due tocchi**: forma e durata sono preselezionate con l'ultima scelta, letta da AsyncStorage. Si persiste la **preferenza** (due valori), non la **bozza** — la preferenza rende il secondo uso più veloce, la bozza rende il primo più lento perché implica che ci sia qualcosa da salvare.
**La posizione non si chiede**: parte `getCurrentCoords()` in sottofondo, la riga «San Salvario · dal tuo telefono» è informativa. Solo se il GPS manca o è fuori città compare `<LocationField>` con `mancanzaPosizione()` — lo stesso componente e la stessa regola di giri ed eventi, come impone `parita-giri-eventi.test.ts`.

> Le due frasi «puoi rientrare quando vuoi» e «si chiude da sola» **non sono decorazione**: dichiarare a un'app dove sei è la cosa che fa esitare di più. Se si tagliano per fare spazio, la funzione la usa meno gente.

**La tab centrale non è una route.** `app/(tabs)/_layout.tsx` usa già una tab bar completamente custom: uno slot `azione` chiama `apri()` da un provider montato sopra `<Tabs>`. Il pattern classico (route fittizia + `preventDefault`) lascerebbe una schermata fantasma che un deep link può aprire sul vuoto. `TAB_ICONS` e `PRIMARY_TABS` — oggi due strutture parallele che possono divergere — diventano **una sola lista ordinata**, che è anche l'ordine visivo.

**Extra ad alto rendimento, mezza giornata: «Passo di qui» dal marker del negozio.** Apre il foglio con forma `negozio`, nota precompilata e **coordinate del negozio**. Un tocco, dal punto in cui la dichiarazione ha più senso. Probabilmente è così che nascerà la maggior parte delle uscite.

### La mappa diventa la vera home

**La legenda esiste già** (`feed-map.tsx:168-176`) e fa metà del mestiere: non è toccabile e non spiega. Diventa **legenda-interruttore** — un tocco accende/spegne il livello, e «Giri» accanto a un pallino impara a dire cosa sia un giro. Un elemento che fa due mestieri, invece di una barra nuova sopra la mappa che sarebbe la soluzione da app di categoria.

> ⚠️ **Un difetto che esiste oggi e nessuno ha visto:** `open_requests` arrotonda le coordinate a **2 decimali** (~1,1 km). **Due giri nello stesso quartiere hanno esattamente lo stesso punto**, e uno copre l'altro. È invisibile solo perché i giri sono pochi. Con quattro livelli diventa il comportamento normale → `lib/mappa-cluster.ts`, funzione pura, raggruppamento **per tipo** (un giro e un negozio nella stessa cella restano due marker: sono cose diverse).

**Camera**: oggi zoom 12 sul centro città — e *una città con tre segnaposto a zoom 12 sembra una città morta*, che è la sensazione che l'ondata deve combattere. Con il fix GPS: **zoom 14 sulla persona**, «il tuo quartiere, non la tua città». ⚠️ Non aggiungere il fix alla `key` della mappa: rimonterebbe a metà gesto, ed è già stato un crash in quel file.

**Il marker delle persone**: il brand vieta un colore in più. Quadrato `surface` con bordo bianco e icona `cheers` — l'unico marker non colorato della mappa. La distinzione è di **forma**, non di tinta: le persone non sono un oggetto colorato in un elenco.

### Un giro che nasce da un'uscita

Due colonne, non una: `da_uscita_id` è **la provenienza** (serve alla reputazione), `destinatario_id` è **il diritto di prelazione**. Se la prelazione dipendesse dalla riga dell'uscita, ritirarla renderebbe il giro invisibile a tutti — e chi ha chiesto verrebbe punito per una scelta di chi è fuori.

**45 minuti**, non «fino alle 23»: un giro nato alle 20:30 resterebbe invisibile a tutta la città per due ore e mezza per una persona che magari non aprirà l'app. **La prelazione è una cortesia breve, non un lucchetto.**

**Nessun valore nuovo in `orders.stato`** (R2): «indirizzato» non è uno stato, è un attributo. La scadenza della prelazione sta **nella `where` della vista** — ricade nel feed pubblico da sola, senza cron, anche a telefoni spenti. E il destinatario vede il giro **senza vedere l'indirizzo**: la vista continua a restituire `null::text as indirizzo`.

**`accept_order` non si tocca** (R5): è già stata riscritta una volta perdendo la guardia dei 50 km e il messaggio «non comprare nulla». La regola va in **`guardie_giro`**, il trigger che esiste esattamente per questo — il suo commento è già la motivazione: *«Le funzioni che fanno avanzare un giro sono otto… Un trigger le copre tutte, comprese quelle che non esistono ancora.»*

**Sui crediti: zero modifiche.** Un giro indirizzato costa e rende **esattamente come tutti gli altri**. Non-obiettivo dichiarato: «un giro nato da un'uscita costa meno». No — premiare economicamente una forma è un algoritmo travestito da gentilezza.

**Rifiutare non annulla il giro: lo libera.** E — stessa decisione presa per `rispondi_amicizia` — il rifiuto **non dice che è stato un rifiuto personale**: dice che il giro è aperto. *Dire a qualcuno che è stato rifiutato non serve a niente e fa solo male.*

### La morte di `smartScore`

`lib/discovery.ts:20-24` è il criterio **predefinito**, e nella UI si chiama **«Per te»** — letteralmente la parola delle piattaforme che questo progetto dice di rifiutare. Tre problemi in ordine di gravità: i pesi (4, 1.6, 1, 2) non li ha giustificati nessuno; il nome; e **`ratingMedio × 4` è il termine dominante mentre `rating_medio` parte da 0** — un nuovo iscritto prende 20 punti in meno, l'equivalente di 12 km. **In una beta a 30 persone, dove ogni nuovo arrivato è metà del valore dell'app, il criterio predefinito lo mette sistematicamente in fondo.** Non è una tensione filosofica: è un difetto misurabile.

> La regola che sostituisce l'algoritmo, da scrivere in cima al file perché fra sei mesi qualcuno vorrà «migliorare l'ordinamento»:
> **«Un ordinamento è accettabile quando la persona che lo subisce può capirlo in una frase.»**

Si ordina per **`finisce_alle` crescente: chi finisce prima, prima.** Non è un giudizio, è un orologio; è inottimizzabile senza dire una cosa vera (dichiarare una finestra corta ti mette in cima **e finisce presto**); non ha pesi da tarare; ed è utile. A parità, **distanza** — un fatto fisico, non una valutazione della persona.

> ⚠️ **`whyThisRequest` muore con lui** (`lib/discovery.ts:34-39`): restituisce **«Persona affidabile»** quando `ratingMedio >= 4.5`. Tutti e quattro i piani volevano togliere la cifra; nessuno aveva notato che **l'app la pronuncia anche a parole, su ogni card del feed.** È `smartScore` con il numero limato via.

⚠️ E il bump di `btb.discovery.filters.v2` → `v3`: il merge in `discovery-context.tsx:31` riporterebbe `'smart'` dai telefoni già installati, che cadrebbe nel ramo di default senza che nessuno se ne accorga.

### La reputazione come fatti

Si toglie **la cifra, non il dato**: `rating_medio` resta, il trigger resta, le recensioni restano. Sparisce come numero da `user/[id].tsx`, `request-card.tsx`, `feed-map.tsx`. *Con 30 persone una media su due recensioni è rumore travestito da misura — e una media mostrata **ordina anche dove non c'è ordinamento**: l'occhio confronta 4.5 e 4.2 da solo.*

Al suo posto, fatti: «12 giri conclusi» · «Porta più di quanto chiede» · «**Puntuale in 7 giri su 8**» (i tre voti di dettaglio esistono dalla V2.1; soglia ≥4, e **sotto le 3 recensioni si scrive «Ancora poche recensioni»** — meglio il silenzio di una statistica falsa) · i complimenti · **«Invitato da X» e «Ha invitato 3 persone»**.

> **In una community a inviti la catena degli inviti È la reputazione**: renderla visibile fa sì che comportarsi male costi a due persone. Manca il verso opposto («ha invitato»), che è il pezzo che fa costare — e manca **il consenso**: oggi «Invitato da X» si pubblica senza che nessuno l'abbia chiesto. Serve `catena_visibile`, default `true` (è già il comportamento attuale), spegnibile.

**La reputazione delle uscite si misura solo sulle richieste ricevute.** Se contassi le dichiarazioni, chi si rende disponibile cinque volte senza ricevere richieste risulterebbe «0 su 5»: sembrerebbe inaffidabile senza colpa, e smetterebbe di dichiarare. **L'app punirebbe esattamente il comportamento che vuole incoraggiare.**
> **Rifiutare non è un danno. Ignorare sì.** La frase è «Ha risposto a 4 richieste su 5».

### `cerco_compagnia` filtra finalmente qualcosa

Il filtro va **nella query**, non nel client (oggi `getPeopleInCity` scarica 30 profili e ne butta uno). Due cose non tornano e vanno sistemate: la promessa dice **«nella tua zona»** ma il filtro è per **città** — il testo si corregge, e la zona compare solo per chi ha un'uscita aperta, che ha coordinate volontarie. E **il flag non scade mai**: la sezione si chiama «Aperti a una birra», sta **sotto** le uscite, e nessuna riga scrive un orario. *L'app non promette una cosa che non sa.* Debito dichiarato.

### Definition of done — giorno 60

Quattro tab, la centrale **non naviga** e il tasto indietro chiude il foglio · **cronometro: meno di 15 secondi e due tocchi, senza scrivere niente** · riaprendo l'app torna la stessa forma e **non** un testo a metà · l'uscita compare su mappa e in elenco · la legenda spegne un livello · due giri nello stesso quartiere = **un** marker con «2» · un giro indirizzato **non** compare al terzo telefono, e chi prova via link diretto riceve il messaggio del trigger, non un errore generico · «Non riesco» → il giro è di tutti entro un refresh e chi ha chiesto è avvisato · **stessi BeerCoin** di un giro identico non indirizzato · su un profilo altrui **nessun numero da 1 a 5** · un profilo con due recensioni dice «Ancora poche recensioni» · il chip dice «Chi finisce prima», mai «Per te» · **nessun APK nuovo è servito**.

### Il rischio numero uno, e come si scopre presto

La tesi assume che **dichiarare sia più facile che chiedere**. È plausibile — chiedere espone, dichiarare no — ma non è dimostrato. Se nessuno dichiara, l'app ha **due** elenchi vuoti invece di uno e sembra il doppio più rotta.

**Un numero, non un'impressione**, costruito in **settimana 1** e non in settimana 4: uscite dichiarate al giorno, e accanto quante hanno ricevuto almeno una richiesta. **Soglia scritta prima di guardare**: se in 7 giorni con 30 persone le uscite sono meno di 15, la tesi è sbagliata *come è stata implementata*, e il colpevole è il foglio, non le persone. Il secondo numero è più crudele: se le dichiarazioni ci sono e le risposte no, il problema è la **visibilità**, non la voglia.

E **gli stati vuoti non dicono mai «non c'è nessuno»**: «A Torino stasera non c'è ancora nessuno. Ci vogliono 15 secondi. → [Ci sono anch'io]». L'azione dentro il vuoto — `EmptyState` ha già `actionLabel`, e il suo commento dice già che con poche persone il vuoto **è lo stato normale del feed**.

---

# Parte 5 — Ondata 3 (mese 3): «I valori diventano funzioni»

```
S1  Chi risponde (metà) + trasparenza aggregata   il potere nasce già guardato
S2  Chi risponde (metà) + IL PARI al centro
S3  Ritaratura BeerCoin + IL QUADERNO pubblico    e si vede che ha smesso di stampare
S4  Apertura repository + Milano decisa, non lanciata
```

**Chi risponde per primo** perché ha la coda più lunga: non basta scriverlo, serve che qualcuno lo diventi e moderi qualcosa **prima** del 90° giorno, o non è verificabile. E gli altri due dipendono: Milano senza chi risponde non si apre, e aprire il repository senza moderazione distribuita mette due persone davanti a un afflusso che non reggono.
**La trasparenza è appiccicata a S1** perché un potere che nasce già osservato è una cosa, un potere a cui si aggiunge l'osservazione tre settimane dopo è un'altra — e la seconda non si fida di nessuno.
**L'apertura per ultima** perché è irreversibile: un `git push` pubblico non si annulla, i mirror esistono entro minuti.

### Chi risponde

Il ruolo è **calcolato dai fatti, mai nominato**: se un fondatore può nominare, il ruolo è delega, e allora BtB non può esistere senza i fondatori — che è la domanda a cui questa ondata deve rispondere. Cancello (§ Contratto C5, senza `rating_medio`): **8+ giri conclusi · 60 giorni · zero provvedimenti · nessuna segnalazione grave a proprio carico · invitato da qualcuno ancora dentro · conferma di chi risponde già in quella città.**

> **Se il risultato è «zero persone qualificate», non si abbassa la soglia.** Un ruolo che nessuno può ancora avere è onesto. Un ruolo dato a chi non se l'è guadagnato è la fine della cosa. Va scritto nel commento della migrazione, e i numeri vanno verificati contro il database prima di fissarli.

**Si accetta, non si viene messi**: la proposta arriva quando i fatti la producono, e la persona decide. *«Non puoi sospendere nessuno, e ogni cosa che fai resta scritta. Puoi dire di no.»* **Si esce quando si vuole**: un moderatore che non può smettere è un moderatore che a un certo punto smette di leggere.

| può | non può |
|---|---|
| vedere le segnalazioni **della propria città** | quelle di altre città |
| **oscurare** un giro, una recensione, un negozio | mettere `'rimosso'` |
| chiudere una segnalazione come infondata, con nota | infliggere provvedimenti |
| inoltrare a un fondatore | toccare `sospeso_fino`, email, saldi, indirizzi, safety map |

**Non c'è nulla da inventare**: `stato_moderazione` esiste (`schema.sql:130-133`), `open_requests` filtra già `= 'ok'`. **Oscurare significa già sparire dal feed senza toccare il giro né la persona.** C'è da dare la chiave a qualcuno in più.

**Le segnalazioni gravi non arrivano mai a chi risponde**: `unsafe` congela il giro ed è l'unica classe in cui la risposta corretta può essere sospendere — che è precisamente il potere che non deleghiamo.

**Sei meccanismi contro il potere di quartiere**: niente autoreferenzialità (nessuno crea un successore) · niente conflitto di parte · niente segreto · **reversibilità unilaterale** (nessuna azione di chi risponde è definitiva — è la differenza sostanziale col potere admin) · massimo 3 per città, *un solo moderatore è un signore locale, tre che si vedono nel registro sono un collegio* · e **il contrappeso di chi subisce**: ogni oscuramento avvisa con la motivazione e un link per contestare, e **la contestazione va ai fondatori**. Un moderatore che sbaglia sistematicamente produce una fila di contestazioni, che è un dato — e quel dato rientra nel cancello alla revisione. Il correttivo si chiude da solo.

**La schermata è brutta per sottrazione**: stessi token di ogni altra schermata, zero accento tranne l'unico bottone, nessuna Card, righe separate da `c.border`. Nessun badge, nessun colore d'onore, nessun titolo sul profilo. *Se moderare diventa uno status si attira chi vuole lo status* — l'app c'è già passata, ed è il motivo per cui `LEVELS` e `BADGES` sono stati svuotati a mano.

### Il registro pubblico

Conteggi, **le motivazioni testuali delle ultime 20 azioni**, il tempo medio di risposta, e i nomi di **chi ha il potere** — ma non di chi ha compiuto il singolo atto. Non è una contraddizione: **è pubblico chi ha il potere, non chi ha fatto il singolo gesto** — esporre il secondo invita alla ritorsione, che è lo stesso ragionamento già fatto per il segnalante.

`tempo_medio_risposta_ore` è il numero che vale più di tutti: **se la moderazione distribuita risponde più in fretta di due fondatori, non è un ripiego — è meglio.** Va nel registro dal primo giorno, perché è la promessa fatta alla community.

> Questa schermata è, da sola, la cosa più antitetica al fintech che l'app contenga. **Nessuna piattaforma pubblica i propri numeri di moderazione a chi la usa.** Va in evidenza, non nelle impostazioni.

### IL PARI al centro

**`karma_for_user` È GIÀ la reciprocità**, espressa male: è la differenza fra i due conteggi, e sta già in `public_profiles`. Non serve una funzione nuova — serve **smettere di chiamarla «karma»** e mostrarla come rapporto invece che come differenza. «Karma» è vaga, suona new age, e soprattutto **un numero negativo accanto a un nome è un marchio**: chi ha ricevuto 4 e portato 1 vede «−3» sul suo profilo.

La card reciprocità sale al primo posto; i BeerCoin scendono sotto le recensioni e **la loro card perde il giallo**. Oggi la prima cosa del profilo è una card gialla piena col saldo, e *il giallo è «l'unico vero colore dell'app»: lo stiamo spendendo sul denaro*. ⚠️ E la barra della reciprocità **non eredita il giallo**, o abbiamo solo spostato l'accento da un punteggio a un altro.

**Chi è appena entrato**: 0 portati e 1 ricevuto fa «0%», che letto sul proprio profilo il secondo giorno è **una condanna**. Tre casi, tre testi: 0 giri → nessuna card, «Il primo è sempre uno che ricevi» · <3 giri → «APPENA ARRIVATO», senza barra né percentuale · ≥3 → la card piena. *La reciprocità è il numero principale dell'app: proprio per questo non deve dire bugie sulle persone appena arrivate.*
> Il custode ha aggiunto un vincolo: **«PORTI PIÙ DI QUANTO CHIEDI» è una lode, e una lode è un punteggio scritto a parole.** Sul proprio profilo restano i due conteggi neutri, e **il gemello negativo è vietato** — con lo stesso argomento con cui si uccide «karma».

### L'economia smette di stampare

> ⚠️ **Il censimento va rifatto: le fonti di conio sono cinque, non quattro, e i numeri nel codice non coincidono.**
> `lib/credits.ts:86` dice `referral: 3`; **il database conia 5+5** (`20260824_inviti.sql:215-216`). Chi implementa cercando «3» toccherà la costante sbagliata e lascerà vivo il trigger. E manca dalla lista **`missione_urbana`**: obiettivi settimanali con barra N/target, premio in BC, «In accredito», reset per `week_start` (`profile.tsx:120-129`) — **è l'oggetto più simile a Glovo che l'app contenga, ed è sopravvissuto alla purga in tutti e quattro i piani.** O va giù con gli altri, o «una fonte sola» è una frase falsa.

Un utente attivo conia ~38 BeerCoin una tantum più una rendita settimanale, senza che corrispondano a nulla uscito dalle tasche di qualcuno. Il commento *«è un trasferimento, non stampa di moneta»* è vero **solo di `accept_order`**.

**Un criterio solo: si conia per aver reso la città più utile.** Benvenuto 5 (invariato) · minimarket approvato 3 · incontro davvero avvenuto 2 · **un giro nato da una tua uscita 2**. Badge, livelli, referral, bonus notturno e missioni settimanali → **zero**.
> **L'invito non ha un prezzo, ed è il ragionamento migliore dei quattro piani**: pagare per portare gente dentro è marketing di crescita, e l'invito resta la cosa più preziosa dell'app *proprio perché* non si paga. La notifica all'inviter resta — è il momento in cui una persona scopre che la sua scelta ha portato bene, e vale più di 5 BeerCoin.

**Tetto morbido a 30**, applicato ridefinendo `available_credits`, che è **tre righe** — così arriva a `set_order_credits` e `accept_order` senza riscrivere le due funzioni che hanno già perso pezzi due volte. ⚠️ E resta `SECURITY INVOKER`: è invoker **di proposito**, così la RLS impedisce di sbirciare il saldo altrui. Aggiungere `security definer` ridefinendola aprirebbe quel buco in silenzio — serve un'asserzione dedicata, perché un `toContain` non lo cattura.

**Nessun saldo viene toccato.** Si spiega prima e a ciascuno, via `avvisa` sul canale prioritario, non con un banner che si può non vedere. L'eccedenza **non si veste da trofeo**: niente oro, niente «hai raggiunto il tetto» — *«Oltre 30 non si spende. Il resto torna in giro.»*

**`restituisci_alla_citta()`** — l'eccedenza si redistribuisce a chi si è iscritto negli ultimi 30 giorni con meno di 5 BeerCoin, **anonima**: *«non sai chi: non è un favore da ricambiare, è come funziona qui.»* È l'unica funzione dell'app in cui una persona dà senza ricevere niente, ed è Fiducia senza clientelismo. **Ed è la prima cosa da tagliare, proprio perché è quella che piace di più.**

### IL QUADERNO

**Il numero che conta è coniati contro circolati.** Se il conio è grande, l'economia sta stampando. **Il fatto che scenda in diretta, davanti alla città, è la dimostrazione — non l'annuncio.** Ed è il motivo per cui il quaderno viene **prima** della ritaratura nella lettura, e la ritaratura si vede accadere.

Cosa si mostra: movimenti per tipo, coniati vs circolati, persone coinvolte, il giorno per giorno. **Cosa non si mostra: chi ha dato a chi** — il grafo dei pagamenti dice con chi ti vedi e quanto spesso, ed è la stessa informazione che l'app si rifiuta di dare in ogni altro punto.
> ⚠️ **Il custode ha respinto le «prime cinque quote senza nomi»: è una classifica**, ed è re-identificabile (col tetto a 30, se ho 31 e la prima quota è 31, sono io). Al suo posto: **saldo mediano · quante persone stanno sopra 20 · quanti BeerCoin sono tornati alla città questo mese.** La distribuzione senza il podio. *Una top-5 anonima resta la gamification che abbiamo appena cancellato, in incognito.*

Chiusura della pagina: **«Nessun nome compare in questa pagina, e non è una dimenticanza.»** Dichiarare cosa si è scelto di non mostrare è la parte della trasparenza che nessuno fa.

### L'apertura del repository

**La buona notizia, verificata sulla storia git**: `.env`, la chiave `adminsdk`, i tre APK e `supabase/.temp/` **non sono mai stati committati**. E `push_shared_secret` è **generato dal database** e non è mai passato da un file: è il pezzo di lavoro passato che oggi permette di aprire **senza rotazioni di segreti**. Va detto ad alta voce nel commit di apertura.

**Cosa c'è invece**: `dist-v2-check/` e `dist-v21-check/` tracciate, con bundle Hermes che inlinano URL del progetto e anon key (pubblici per design, ma **la loro presenza fa sembrare che qualcuno abbia committato una chiave** — che nel giorno dell'apertura è la stessa cosa); `google-services.json`; il project ref hardcodato in quattro migrazioni.

> **Cinque blocchi che nessuno dei piani aveva visto, e li ha trovati il custode:**
> 1. **`README.md:1` è ancora il boilerplate di `create-expo-app`** — «Welcome to your Expo app 👋», link a Discord, `npm run reset-project`. La porta d'ingresso di un progetto AGPL «fatto dalla community» è il template di un'altra azienda, e il suo primo carattere è un'emoji appena vietata.
> 2. **`app/_layout.tsx:25-29` ha un DSN Sentry vivo, in chiaro**, `tracesSampleRate: 0.2` — e `app/terms.tsx` **non nomina mai** crash reporting o terze parti. Per un'app la cui mission è «PIÙ COMMUNITY, MENO ALGORITMI» e che sta per aprire un registro pubblico, è l'unica ipocrisia di cui quella pagina si vergognerebbe. O diventa variabile d'ambiente **e** una riga nei termini, o si toglie.
> 3. **`app.json:70`**: «Beer to Beer usa la tua posizione per mostrare **le consegne** vicine». È il testo che Android mostra nel dialogo dei permessi. Quattro piani hanno epurato «consegna» dalle schermate; nessuno ha aperto il manifest.
> 4. **`app.json:16`**: sfondo dell'icona adattiva `#090909` contro splash `#0F0F0F`. Due neri, una bible.
> 5. **La brand bible è modificata e non committata** (` M Brand/fontbeer/brandbible_btb.pdf`). Il documento che deve essere il punto fisso è già stato toccato, e l'apertura esclude `Brand/` dalla licenza: quella modifica è invisibile a chiunque non abbia questa copia. **Ogni modifica alla bible dev'essere un commit con un messaggio, o il marchio non ha storia.**

**Non serve riscrivere la storia git**: due `git rm --cached`, una chiave Firebase da restringere in console, l'URL del progetto in `app_secrets`. Una giornata, non una settimana. **Il rischio dell'apertura non è tecnico — è sociale.**

**`CONTRIBUTING.md` è il file che gestisce il rischio vero**, e il rischio non è la sicurezza: è **una persona che non ha tempo di revisionare PR e si sente in colpa a non rispondere**. È la causa numero uno di abbandono di un progetto no-profit. Prima riga, non in fondo: *«Chi tiene questo progetto è UNA persona… Una pull request può restare aperta settimane. Non è maleducazione.»*

**Il README indirizza alle migrazioni**: *«Se vuoi capire com'è fatta quest'app, non leggere il codice. Leggi i commenti in cima alle migrazioni in ordine di data. È un diario di errori, ed è la parte di cui andiamo più fieri.»* — è open source, punk e onesto in un colpo solo, ed è vero. **AGPLv3** con marchio, logo e `Brand/` **esclusi**: senza quella riga, un fork può chiamarsi Beer to Beer.

**Un solo canale d'ingresso non si sostituisce**: `app/feedback.tsx` resta, perché la maggior parte delle persone che usano BtB non ha e non vuole un account GitHub, e mandarcele è escludere. Si aggiunge una seconda strada.

### Milano: decisa, non lanciata

Tecnicamente non serve niente — Milano è già in `lib/cities.ts` e in `city_bounds`. **Aprirla oggi è zero righe di codice, il che è precisamente il problema: la cosa più facile da fare è quella che si deve fare per ultima.**

> **Milano non si apre in questa ondata. Si apre quando la prima persona milanese passa il cancello di chi risponde, e non prima.** Non è un rinvio: è la conseguenza logica dell'Ondata 3. Aprendo prima, l'unico modo di moderarla sarebbe che la moderasse un torinese — cioè un potere coloniale, che è esattamente ciò che il cantiere esiste per evitare.

**Cosa si fa invece**: una schermata di attesa, non un feed vuoto.
> «MILANO NON È ANCORA APERTA. Ci sono 12 persone che aspettano. Ne servono 40, in almeno tre quartieri diversi, e una che risponda per la città. Non apriamo prima perché una città con quattro persone è peggio di una città chiusa: chiedi una birra e non risponde nessuno, e non torni più. [Avvisami quando apre] [Porta dentro qualcuno]»

⚠️ Parametrica sulle **quattro** città di `lib/cities.ts`, e i numeri **dal DB**: un 12 hardcoded che non si muove mai è peggio di nessun numero.
**Il numero da guardare non è «40 milanesi»: è «4 persone a Lambrate».** Quaranta sparse su Milano sono meno utili di dodici a Lambrate — e il bonus distanza a 1 BC/km pagherebbe una birra a 8 km come se fosse un favore fra vicini. **Milano si apre a quartieri, non a città.**

### Definition of done — giorno 90

`chi_risponde` ha **almeno una riga**, e non è un fondatore · **almeno un contenuto moderato da chi non è fondatore** · `mod_oscura_giro` su un'altra città **fallisce** · chi subisce un oscuramento riceve motivazione e link per contestare · `/registro` aperto a chiunque, col **tempo medio di risposta** · `/quaderno` mostra coniati e circolati separati e **nessun nome** · reciprocità prima card, **«karma» non esiste più in nessuna schermata** · un account con 0 giri non vede né barra né percentuale · in 7 giorni si conia **solo** benvenuto e utilità civica · **`sum(crediti_saldo)` identico prima e dopo** · repo pubblico con `LICENSE`/`CONTRIBUTING`/`SECURITY`, `git ls-files` pulito, il test in CI · `APK_URL` scaricabile **in incognito** · chi seleziona Milano vede i numeri veri.

### Cosa si taglia, in ordine
`restituisci_alla_citta` (1,5 g) — **per prima proprio perché piace di più** → Milano intera (2 g), nessuno la sta aspettando tranne noi → `project_url` in `app_secrets` (0,5 g + il rischio R5 su `push_to_users`, già rotta una volta: **non toccarla sotto pressione è saggio, non pigro**) → `/chi-lha-fatta` (0,5 g) → la schermata di contestazione ⚠️ *ma l'avviso con la motivazione resta, è dentro `mod_oscura_giro` e costa zero* → il quaderno (2 g), **tenendo almeno coniati vs circolati come due numeri nel registro**: venti righe che portano il 70% del messaggio → **l'apertura del repository (3 g)**.

> ⚠️ **Sull'apertura, la regola non è una raccomandazione:** rimandarla di un mese non costa niente. Farla stanchi, l'ultimo giorno, per rispettare una scadenza, è il modo in cui si pubblica una chiave. **Se il quarto lunedì non è tutto pronto e riletto, non si apre.**

**Non si taglia mai**: chi risponde e IL PARI al centro. Se non ci stanno **entrambe**, il mese è fallito e va detto, non nascosto tagliando altrove.

### La domanda: BtB può esistere senza i fondatori?

Oggi no, e strutturalmente: `is_admin_user()` è il cancello di 11 funzioni, `is_admin` è una colonna messa a mano, e l'unico modo di diventare admin è che un admin ti ci metta. **La risposta di questa ondata non è «sì»: è «possiamo cominciare a misurarlo, ed ecco il termometro».**

**M1** frazione degli atti di moderazione non compiuti da fondatori (oggi 0%) · **M2** tempo mediano di risposta a una segnalazione **e chi ha risposto** — il numero che conta di più · **M3** copertura del ruolo, che distingue *nessuno qualificato* (la città è giovane, è un fatto) da ***qualificati che non accettano* — il segnale peggiore**: la community c'è e non si fida abbastanza da prendersene un pezzo · **M4** coniati/circolati: un'economia in cui i BeerCoin circolano molto più di quanti se ne creano **non ha bisogno di un banchiere**.

**M5 · Il test dei quindici giorni.** Il 90° giorno i fondatori **non aprono `/admin` per quindici giorni**. Poi si guarda cosa è rimasto aperto. **Le prime quattro misure dicono se il meccanismo esiste; solo M5 dice se regge.** Va programmato adesso, con la data: un esperimento del genere non si fa mai spontaneamente.

> Il rischio che non si può mitigare, e che va scritto nel registro: **la prima persona che accetterà il ruolo sarà quasi certamente qualcuno che i fondatori conoscono di persona.** Il criterio è automatico, ma il bacino da cui pesca oggi sono venti amici. *«Non è ancora la prova che il meccanismo funziona: la prova arriva quando risponde qualcuno che non abbiamo mai incontrato.»* Scriverlo è più onesto che fingere.

---

# Parte 6 — Regole di compatibilità

Ognuna ancorata a un incidente già avvenuto in questo repository.

**R1 · Mai togliere una colonna da una vista letta dal client.** `data/api.ts` seleziona per nome e `open_requests` si ricrea con `drop`+`create`. Una drop che dimentica una colonna risponde *«colonna inesistente»* e feed e mappa restano vuoti **con un finto errore di connessione**. È già successo: l'intestazione di `20260826_fix_feed.sql` lo racconta. Solo aggiunte.

**R2 · Mai aggiungere valori a `orders.stato`.** `STATO_LABEL` è un `Record<OrderStatus,string>` e `ORDER_TIMELINE` ci indicizza: uno stato sconosciuto stampa `undefined`. Situazioni nuove = **colonne** (`congelato` è il precedente giusto) o **tabelle**. Vale anche per `notification_inbox.category`, che ha un check chiuso: la categoria `'uscita'` entra nello stesso commit in cui esce `'mission'`.

**R3 · Mai revocare un permesso prima che l'app abbia smesso di usarlo.** RPC nuova → OTA → **attesa di due settimane** → revoca. ⚠️ `confirm_order` va revocata `from public`, non `from authenticated`: non ha mai avuto un grant esplicito, quindi è eseguibile da PUBLIC — la stessa falla già trovata e chiusa in `20260902_segnalazioni.sql:458-462`.

**R4 · Mai cambiare la firma di una RPC: aggiungere un overload.** `push_to_users` mostra già il pattern.

**R5 · Rigenerare, non ribattere.** Ridefinire una funzione intera per cambiare due righe è il momento esatto in cui si perde una guardia — il controllo dei 50 km contro il GPS falsificato, il `search_path`, il messaggio «non comprare nulla». `funzioni-non-perdono-pezzi.test.ts` legge i `.sql`: **ogni funzione ridefinita va aggiunta a quella lista PRIMA di toccarla.** ⚠️ E quel test copre solo `create or replace function`: **le viste non sono coperte**, ed è il buco da cui è passato l'incidente del 26 agosto.

**R6 · `app.json.version` è la leva che spegne la beta.** `runtimeVersion.policy: "appVersion"`: cambiarla rende invisibili tutti gli OTA successivi ai telefoni già installati, **in silenzio, senza errore**. Durante la beta è congelato. Il passaggio si pianifica (Ondata 1, C1), non si lascia derivare.

**R7 · Ambienti separati.** Non sviluppare la V3 contro il database della beta. Un secondo progetto è gratis. Il rischio non è lo schema: è `RESET-BETA.sql` eseguito sulla connessione sbagliata alle due di notte.

**R8 · Migrazioni in due tempi.** Ogni file mantiene la convenzione di casa (*«Eseguire in qualsiasi momento. Sicuro da rieseguire. Non cancella nulla.»*). Una che violerebbe R1/R2/R3 si spezza in `_parte1_aggiunge` e `_parte2_rimuove`, **con nell'intestazione la data in cui la seconda diventa sicura**. `CONTROLLO-MIGRAZIONI.sql` va esteso a ogni file nuovo: è l'unica cosa fra uno sviluppatore solo e *«quale di questi venti file ho eseguito in produzione?»*.

**R9 · Mezza giornata a settimana per ciò che si rompe.** L'Ondata 3 eredita roba fresca dall'Ondata 2, che si romperà. Il tempo per rispondere non è in nessun piano e va messo — preso dal cantiere in corso, non dal weekend. Senza, la prima settimana in cui l'Ondata 2 esplode mangia il cantiere del mese.

---

# Parte 7 — I test-guardia

Convenzione della casa: nome in italiano, e un commento in cima che racconta **l'errore concreto** che il test previene. Ogni test legge i `.sql`: **la fonte di verità è il database, il TypeScript la rispecchia.**

| Nuovo | Cosa protegge |
|---|---|
| **`viste-non-perdono-colonne`** | *Il più importante del piano.* Confronta le colonne proiettate da ogni vista con le `*_COLUMNS` di `data/api.ts`. Rende **impossibile** ripetere l'incidente del 26 agosto |
| `una-porta-sola` | Gli `url` di `conversazioni` puntano a rotte vere · la Home non scarica più 80 righe · campanella e chat non contano la stessa cosa · **ogni ramo del union filtra su `auth.uid()`** |
| `niente-codice-morto` | Ogni `export` di `data/api.ts` ha un consumatore, con lista di eccezioni **datata** — così l'Ondata 2 non costruisce sopra `getLeaderboard` credendola viva |
| `versione-e-canale` | `app.json.version` = `app_release.versione` = `APK_URL` · Sentry configurato · niente più `'V2.1'` hardcoded |
| `niente-ranking` | `smartScore` **e `whyThisRequest`** non esistono più · nessuna funzione di ordinamento legge `ratingMedio` · «Per te» non torna |
| `foglio-in-due-tocchi` | Il foglio non salva bozze e usa `LocationField`. Difende dallo scope creep: **ogni campo aggiunto sembra utile e uccide la spontaneità** |
| `chi-risponde-non-puo-sospendere` | Nessuna `mod_*` tocca `sospeso_fino` o `provvedimenti` · solo `is_admin_user` arriva a `'rimosso'` · **`puo_rispondere` non contiene nessuna nomina manuale** |
| `redazione-non-perde-pezzi` | Le funzioni pubbliche non espongono email, `sospeso_fino`, chi ha segnalato, chi ha dato a chi |
| `reciprocita-al-centro` | La reciprocità precede i BeerCoin · il profilo altrui non mostra mai un saldo · «karma» non compare |
| `niente-segreti-nel-repository` | In CI dal giorno dell'apertura: **da lì ogni commit è irreversibile** |

**Da estendere, mai aggirare**: `copertura-stati` (`consegnato` resta leggibile ma non producibile, **e resta nella policy della chat**), `glossario` (7 controlli, il #2 è il contatore della migrazione), `limiti-e-confini`, `formula-crediti`, `funzioni-non-perdono-pezzi`, `niente-dati-muti` (le catene nuove: `uscite`, `letture`, `cerco_compagnia`), `parita-giri-eventi`, `persone`, `orders`.

---

# Verifica

**Scudo, dal SQL Editor**: una segnalazione di prova su un giro `richiesto` **non** sospende più l'host · `pair_allowed` fra due amici senza giri in comune → `true` · un utente con 3 giri scaduti ha `available_credits` pieno · `verify_delivery_code` rifiuta un `expires_at` passato e accetta `null`.

**Scudo, su un telefono vero** (`npm test` prima, sempre): **#1** «Invia» raggiungibile con tastiera aperta su schermo piccolo · **#5/#6** un giro segnalato sparisce da «GIRO ATTIVO», il dettaglio dice che è fermo, i pulsanti non compaiono · **#7** l'host vede avatar, nome e rating di chi porta, con link al profilo · **#3** la lista amici è in cima al Profilo · **#2** un admin chiude un giro e **entrambe le parti** ricevono la notifica · **#4** chi ha già l'app vede le novità **una sola volta**, chi installa da zero **non** le vede.

**Prova di non-regressione OTA, una volta prima di distribuire il link**: installare l'APK su un telefono pulito e verificare che i due OTA si applichino in ordine.

**A ogni ondata**: `npm test` deve fallire se una guardia è caduta — e **almeno un test-guardia nuovo va visto fallire apposta**, perché uno che non si è mai visto fallire non si sa se funziona. Le migrazioni si eseguono **due volte di fila** per verificare che siano davvero rieseguibili.

---

## Le decisioni che restano al fondatore

1. **Repository pubblico o privato**, in settimana 1 dell'Ondata 1: da questo dipende se `releases/latest` funziona, e quindi il piano di distribuzione dell'APK.
2. **Il DSN Sentry** (`app/_layout.tsx:25-29`): variabile d'ambiente **e** una riga nei termini, oppure si toglie. Non può restare taciuto in un'app che apre un registro pubblico.
3. **La correzione della bible**: «CONSEGNA. BEVI. RIPETI.» → «PORTA. BEVI. RIPETI.». Non è l'app che piega il manifesto — è il manifesto che si allinea alla propria vision, che dice «non è un servizio di delivery» e poi usa il verbo del delivery. **E la bible va committata**: oggi risulta modificata e non salvata.
4. ~~**«Vibe»**~~ — **decisa il 26/08/2026: la funzione resta.** Andava bene
   nella versione precedente; quello che non funzionava era il filtro, ed è
   corretto. Vedi «Decisioni del fondatore» in cima. *(Resta discutibile la
   parola in sé — «Home» muore perché è l'unica parola inglese di una barra —
   ma è una questione di lingua, non di funzione, e non blocca niente.)*
5. **Gli sticker sbloccabili** (`ProfileSticker.unlocked`, `unlockHint`): se badge e livelli cadono perché sono status, cadono anche i cosmetici a sblocco — altrimenti il principio diventa «niente status, a meno che non sia carino».

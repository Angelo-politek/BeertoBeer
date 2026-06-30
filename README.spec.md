# Beer to Beer — piattaforma open source di delivery birra + incontri sociali

## 1. Visione

App mobile gratuita e open source, senza scopo di lucro per nessuno (donazioni volontarie escluse), che combina:

1. **Consegna a domicilio "tra amici"** di birre acquistate nei minimarket etnici ("bangladini") presenti in modo capillare nelle grandi città italiane (Torino, Milano, Roma, Bologna).
2. **Dating organico / social discovery** tramite la "vibe mode": chi richiede le birre può invitare formalmente chi le consegna a fermarsi a bere insieme.

Il principio cardine: **nessun guadagno economico per nessuno**. Il driver viene rimborsato esattamente della spesa sostenuta e riceve in cambio solo crediti della piattaforma (spendibili a loro volta per farsi consegnare birre), mai denaro. Questo disincentiva l'uso predatorio o commerciale dell'app e mantiene la community composta da persone che cercano davvero uno scambio alla pari tra coetanei.

## 2. Target utenti

- Studenti universitari e giovani (18-30 anni) nelle grandi città italiane
- Persone che vivono vicino a zone universitarie/movida con alta densità di minimarket
- Chi cerca sia un servizio pratico (birra a domicilio veloce ed economica) sia un modo informale e a basso rischio di conoscere gente nuova

## 3. Funzionalità core (MVP)

### 3.1 Profilo utente
- Foto, nome, età (con gate 18+ obbligatorio in onboarding), bio breve, interessi/preferenze birra
- Rating di affidabilità (calcolato da recensioni reciproche post-scambio)
- Storico scambi effettuati
- Possibilità di segnalare o bloccare un altro utente

### 3.2 Richiesta birre (host)
- Creazione di un "ordine": tipo e quantità di birre, indirizzo di consegna, fascia oraria desiderata
- Toggle **vibe mode**: se attivo, l'host invita esplicitamente il driver a fermarsi per bere insieme una volta consegnato
- Stato ordine: richiesto → accettato → in consegna → consegnato → confermato (entrambe le parti confermano per chiudere la transazione e sbloccare i crediti)

### 3.3 Feed e accettazione (driver)
- Elenco delle richieste attive nelle vicinanze, ordinabili per distanza/crediti offerti
- Dettaglio richiesta con profilo dell'host, rating, eventuale vibe mode attiva
- Accettazione, navigazione verso il negozio + indirizzo di consegna (mappa)

### 3.4 Sistema crediti (nessun denaro reale tra utenti)
- Ledger trasparente di tutte le transazioni (ogni movimento è tracciato e riconducibile a un ordine specifico)
- Il driver riceve: rimborso esatto della spesa (gestito fuori piattaforma, in contanti/app di pagamento tra privati al momento della consegna) + crediti piattaforma
- I crediti si possono solo guadagnare consegnando e solo spendere richiedendo consegne: non sono convertibili in denaro, non hanno mercato secondario

### 3.5 Sicurezza e moderazione
- Verifica età in fase di registrazione (data di nascita + accettazione esplicita dei termini)
- Sistema di segnalazione utenti/ordini con motivazioni predefinite
- Possibilità per l'host di rifiutare un driver specifico e viceversa
- Indirizzo esatto di consegna visibile al driver solo dopo l'accettazione dell'ordine (mai nel feed pubblico)
- Pulsante sempre visibile per disattivare la vibe mode o annullare un ordine in qualsiasi momento

## 4. Modello economico e distribuzione

- App **gratuita**, **open source**, nessun ricavo per founder o piattaforma
- Sostenibilità tramite **donazioni volontarie** (Open Collective / Ko-fi / GitHub Sponsors), usate esclusivamente per coprire costi infrastrutturali (hosting backend, eventuali API a pagamento come mappe)
- Licenza consigliata: **AGPLv3** (impedisce fork commerciali chiusi che sfruttano il lavoro della community)
- Distribuzione iniziale: build APK via GitHub Releases + TestFlight per beta tester iOS. Valutazione di store ufficiali (Google Play / App Store) solo dopo validazione che la policy alcol non crei blocchi in fase di review

## 5. Considerazioni legali e di sicurezza da tenere a mente

- Nessuna vendita diretta di alcol da parte della piattaforma: l'app facilita solo uno scambio di favori tra privati, con rimborso spesa e crediti non monetizzabili — va comunicato chiaramente nei Termini di Servizio
- Gate età 18+ obbligatorio, anche se non verificabile in modo rigoroso in un progetto no-profit (richiesta esplicita + responsabilità dichiarata dall'utente)
- La vibe mode implica l'incontro fisico con uno sconosciuto: servono meccanismi di fiducia (rating, recensioni, segnalazioni) e privacy graduale dell'indirizzo
- Consultare un parere legale prima del lancio pubblico su larga scala, soprattutto riguardo normative locali su alcol e responsabilità in caso di incidenti

## 6. Stack tecnologico

- **Frontend**: React Native + Expo (TypeScript) — scelto per velocità di sviluppo con AI coding assistant e per evitare configurazioni native complesse all'inizio
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage + Edge Functions), open source e self-hostabile in futuro
- **Mappe**: Mapbox (free tier)
- **Notifiche push**: Expo Push Notifications
- **Chat vibe mode**: tabelle Postgres + Supabase Realtime

## 7. Schema dati essenziale (MVP)

```
users
  id, nome, eta, bio, foto_url, rating_medio, crediti_saldo, created_at

orders
  id, host_id, driver_id (nullable), lista_birre (jsonb),
  indirizzo, lat, lng, stato, vibe_mode (bool),
  crediti_offerti, created_at, updated_at

credit_transactions
  id, order_id, from_user_id, to_user_id, importo, tipo, created_at

reviews
  id, order_id, from_user_id, to_user_id, voto, commento, created_at

reports
  id, reported_user_id, reporting_user_id, order_id (nullable), motivo, created_at
```

## 8. Roadmap a fasi

### Fase 0 — Demo cliccabile, no backend (2-3 giorni)
App Expo con dati finti hardcoded in memoria. Obiettivo: validare UX/UI e raccogliere primo feedback da amici. Schermate: feed richieste, dettaglio richiesta (con vibe mode), wallet crediti, profilo.

### Fase 1 — MVP funzionante (1-2 settimane)
- Integrazione Supabase: auth, profili, ordini reali
- Feed richieste vicine (geolocalizzazione semplice)
- Flusso completo ordine: crea → accetta → consegna → conferma
- Wallet crediti con ledger reale
- Rating e segnalazione base

### Fase 2 — Rifinitura (1 settimana)
- Mappa reale (Mapbox)
- Notifiche push
- Chat in-app per coordinare la vibe mode
- Pannello di moderazione minimo

### Fase 3 — Community privata (continuo)
Beta chiusa con un piccolo gruppo in una città, raccolta feedback iterativa, apertura graduale, eventuale submission agli store ufficiali.

## 9. Principi guida per lo sviluppo (vibe coding)

- Procedere una fase alla volta, senza saltare alla Fase 1 prima che la Fase 0 sia validata visivamente
- Mantenere il codice semplice e leggibile: meglio poche feature solide che molte instabili
- Dati finti/mock chiaramente isolati in un file dedicato, così da poter passare a Supabase senza riscrivere la UI
- Ogni nuova funzionalità deve passare prima per una versione "finta" cliccabile, poi per l'integrazione reale
# Sicurezza

## Se trovi un buco

**Non aprire una issue pubblica.** Scrivi a chi tiene il progetto — il contatto
è nel profilo GitHub del proprietario del repository — e lascia qualche giorno
per chiudere il problema prima di raccontarlo in giro.

Vale soprattutto per: policy di Row Level Security che lasciano leggere dati di
altre persone, funzioni `security definer` che non controllano chi chiama, e
qualunque modo di far comparire l'indirizzo di casa di qualcuno prima che
quella persona abbia accettato un giro.

---

## Quello che è pubblico per costruzione, e non è un errore

Questa sezione esiste perché la prima segnalazione che arriva a un repository
appena aperto è quasi sempre la stessa, ed è meglio rispondere prima che la
domanda arrivi.

**Sì, nel codice c'è una chiave Supabase, e sì, va bene.** È la *anon key*:
è pubblica per progetto, sta dentro ogni APK che abbiamo distribuito, e da sola
non permette di leggere niente. Tutto ciò che protegge sta nella Row Level
Security: le viste pubbliche (`open_requests`, `public_profiles`,
`uscite_aperte`) restituiscono già dati **redatti** — coordinate arrotondate a
circa un chilometro, indirizzo mai, e chi si è bloccato a vicenda non compare.

**Il segreto vero non è mai passato da un file.** `push_shared_secret` — quello
che autorizza l'invio delle notifiche — viene generato dal database
(`supabase/migrations/20260822_beta_hardening.sql`) e vive solo lì e nei segreti
delle Edge Function. È il pezzo di lavoro passato che ha permesso di aprire
questo repository senza dover ruotare niente.

**`google-services.json` è tracciato.** La chiave Android che contiene non è un
segreto per progettazione (sta dentro ogni APK); è ristretta per package e
firma nella console Google Cloud.

**Nella storia git ci sono due cartelle di build** (`dist-v2-check`,
`dist-v21-check`) con dentro l'URL del progetto e la anon key. Non sono più
tracciate. Non abbiamo riscritto la storia per toglierle: contengono solo cose
che sono comunque dentro ogni APK pubblicato, e riscrivere la storia
invaliderebbe ogni riferimento a un commit senza recuperare niente.

---

## Le regole che tengono in piedi il resto

Se leggi il codice per cercarci un buco, questi sono i punti dove guardare — e
dove abbiamo già guardato.

- **Nessuna scrittura importante passa da una policy.** Cambiare lo stato di un
  giro, aprire un'uscita, moderare qualcosa: tutto passa da funzioni
  `security definer`, che controllano chi chiama.
- **Le guardie stanno nei trigger, non nelle funzioni.** Le funzioni che toccano
  un giro sono otto; un trigger le copre tutte, comprese quelle che non
  esistono ancora. Vedi `guardie_giro` e `guardie_uscite`.
- **La redazione sta in SQL, mai nella schermata.** Nascondere un campo
  nell'interfaccia non è protezione: se il dato esce dal database, è uscito.
- **Un test legge i `.sql` e verifica che le guardie ci siano ancora**
  (`lib/__tests__/funzioni-non-perdono-pezzi.test.ts`,
  `viste-non-perdono-colonne.test.ts`). Esistono perché quelle guardie sono già
  state perse tre volte, riscrivendo una funzione per cambiarci due righe.

---

## Diagnostica

**Oggi l'app non manda niente a nessun servizio di terze parti.** C'è il codice
per Sentry, ma resta spento se manca `EXPO_PUBLIC_SENTRY_DSN`. Prima di
accenderlo va aggiunta una riga a `app/terms.tsx`: la pagina che promette di
dire «chi vede cosa» non può tacere una cosa del genere.

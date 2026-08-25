import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

/**
 * LA PAGINA CHE UNA PERSONA FIDATA PUO' DAVVERO APRIRE.
 *
 * Segnalazione del collaudo: «pulsante "condividi stato del giro" insensato,
 * manda un link che non si puo aprire. Se vogliamo tenerlo deve mandare la
 * posizione a una persona fidata altrimenti non ha senso».
 *
 * Il vecchio pulsante mandava `beertobeer://request/<id>`: apre l'app, e
 * soltanto a chi partecipa a quel giro. Un genitore o un amico senza app
 * vedevano un link morto.
 *
 * Questa pagina si apre da qualsiasi telefono, senza installare niente e senza
 * account. Il codice nell'indirizzo e' l'unica chiave, non si indovina, scade
 * da solo dopo dodici ore e chi lo ha creato puo' revocarlo.
 *
 * COSA NON C'E' DENTRO, di proposito: l'indirizzo di consegna, le coordinate
 * della casa, i cognomi, i contatti. E la posizione di chi porta compare solo
 * se e' stato LUI a condividere il link — chi chiede non puo' pubblicare a uno
 * sconosciuto dove si trova un'altra persona. La regola vive nella funzione
 * SQL `giro_pubblico`, non qui: se domani si scrive un'altra pagina, la regola
 * resta una sola.
 *
 * DEPLOY: "Enforce JWT verification" OFF. E' una pagina pubblica per
 * definizione — chi la apre non ha un account.
 */

type Risposta = {
  esito: 'ok' | 'inesistente' | 'scaduto' | 'revocato';
  stato?: string;
  citta?: string | null;
  condiviso_da?: string | null;
  chi_chiede?: string | null;
  chi_porta?: string | null;
  creato_il?: string;
  aggiornato_il?: string;
  scade_il?: string;
  posizione?: { lat: number; lng: number; aggiornata: string } | null;
};

const STATI: Record<string, { titolo: string; spiega: string }> = {
  richiesto: { titolo: 'In attesa', spiega: 'Nessuno ha ancora preso questo giro.' },
  accettato: { titolo: 'Qualcuno ci va', spiega: 'Il giro e stato accettato.' },
  in_consegna: { titolo: 'In viaggio', spiega: 'Chi porta le birre e per strada.' },
  arrivato: { titolo: 'Arrivato', spiega: 'Chi porta le birre e sul posto.' },
  consegnato: { titolo: 'Consegnato', spiega: 'Le birre sono state consegnate.' },
  confermato: { titolo: 'Finito bene', spiega: 'Il giro si e chiuso regolarmente.' },
  annullato: { titolo: 'Annullato', spiega: 'Il giro e stato annullato.' },
};

/** Niente HTML dai dati: i nomi li scrivono le persone. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ora(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function pagina(corpo: string, ricarica = false): Response {
  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${ricarica ? '<meta http-equiv="refresh" content="45">' : ''}
<title>Beer to Beer</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 20px 40px;
    background: #0F0F0F; color: #F4F1EA;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
  }
  .foglio { max-width: 480px; margin: 0 auto; }
  .marchio { font-size: 13px; letter-spacing: .18em; text-transform: uppercase; color: #F6B21A; margin-bottom: 28px; }
  h1 { font-size: 30px; line-height: 1.15; margin: 0 0 8px; }
  .sotto { color: #A8A399; margin: 0 0 28px; }
  .riquadro { background: #171717; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
  .riga { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; }
  .riga + .riga { border-top: 1px solid #262626; }
  .etichetta { color: #A8A399; }
  .valore { text-align: right; }
  a.mappa {
    display: block; text-align: center; text-decoration: none;
    background: #F6B21A; color: #0F0F0F; font-weight: 700;
    padding: 14px; border-radius: 12px; margin-bottom: 14px;
  }
  .nota { color: #A8A399; font-size: 13px; margin-top: 22px; }
  .avviso { background: #2A1A1A; border-left: 3px solid #C4472F; padding: 14px; border-radius: 8px; }
</style>
</head>
<body><div class="foglio"><div class="marchio">Beer to Beer</div>${corpo}</div></body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Un link di sicurezza non deve restare in cache ne' finire nei motori.
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function pagina_chiusa(titolo: string, spiegazione: string): Response {
  return pagina(
    `<h1>${esc(titolo)}</h1>
     <div class="avviso">${esc(spiegazione)}</div>
     <p class="nota">Beer to Beer e un progetto senza scopo di lucro: i vicini si portano le birre a vicenda. Nessuno ci guadagna sopra.</p>`,
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('t');

  if (!token || !/^[a-f0-9]{20,64}$/.test(token)) {
    return pagina_chiusa('Link non valido', 'Questo indirizzo non corrisponde a nessun giro.');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return pagina_chiusa('Momentaneamente non disponibile', 'Riprova fra qualche minuto.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc('giro_pubblico', { p_token: token });
  if (error) {
    return pagina_chiusa('Momentaneamente non disponibile', 'Riprova fra qualche minuto.');
  }

  const r = data as Risposta;

  if (r.esito === 'scaduto') {
    return pagina_chiusa(
      'Link scaduto',
      'I link di Beer to Beer durano dodici ore e poi si spengono da soli. Chiedi che te ne mandino uno nuovo.',
    );
  }
  if (r.esito === 'revocato') {
    return pagina_chiusa('Link spento', 'Chi lo ha mandato ha smesso di condividere questo giro.');
  }
  if (r.esito !== 'ok') {
    return pagina_chiusa('Link non valido', 'Questo indirizzo non corrisponde a nessun giro.');
  }

  const stato = STATI[r.stato ?? ''] ?? { titolo: 'In corso', spiega: '' };
  const finito = r.stato === 'confermato' || r.stato === 'annullato';

  const righe: string[] = [];
  if (r.chi_porta) righe.push(`<div class="riga"><span class="etichetta">Chi porta</span><span class="valore">${esc(r.chi_porta)}</span></div>`);
  if (r.chi_chiede) righe.push(`<div class="riga"><span class="etichetta">Chi ha chiesto</span><span class="valore">${esc(r.chi_chiede)}</span></div>`);
  if (r.citta) righe.push(`<div class="riga"><span class="etichetta">Dove</span><span class="valore">${esc(r.citta)}</span></div>`);
  righe.push(`<div class="riga"><span class="etichetta">Ultimo aggiornamento</span><span class="valore">${esc(ora(r.aggiornato_il))}</span></div>`);

  const mappa = r.posizione
    ? `<a class="mappa" href="https://www.openstreetmap.org/?mlat=${r.posizione.lat}&mlon=${r.posizione.lng}#map=16/${r.posizione.lat}/${r.posizione.lng}" target="_blank" rel="noreferrer">Vedi dove si trova sulla mappa</a>
       <p class="nota">Posizione aggiornata alle ${esc(ora(r.posizione.aggiornata))}.</p>`
    : `<p class="nota">La posizione non viene mostrata: la puo condividere soltanto chi porta le birre, e solo della propria.</p>`;

  return pagina(
    `<h1>${esc(stato.titolo)}</h1>
     <p class="sotto">${esc(stato.spiega)}</p>
     ${finito ? '' : mappa}
     <div class="riquadro">${righe.join('')}</div>
     <p class="nota">${esc(r.condiviso_da ?? 'Una persona')} ha condiviso questo giro con te. La pagina si aggiorna da sola, e si spegne alle ${esc(ora(r.scade_il))}.</p>
     <p class="nota">L'indirizzo di casa non compare mai su questa pagina.</p>`,
    !finito,
  );
});

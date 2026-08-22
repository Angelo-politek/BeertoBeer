import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

/**
 * Invia push Expo agli utenti indicati.
 *
 * Payload nuovo:   { userIds: string[], title: string, body: string, url?: string }
 * Payload legacy:  { userId: string, orderId?: string, message?: string }
 *   (usato dalle vecchie versioni del trigger notify_new_message — normalizzato qui,
 *    così l'ordine di deploy edge function → schema.sql non ha finestre rotte)
 *
 * Deployata con "Enforce JWT verification" OFF: viene chiamata da pg_net senza
 * header di autenticazione (vedi trigger push_to_users in schema.sql).
 *
 * Proprio perché il JWT è disattivato, la funzione si difende da sola con un
 * segreto condiviso: senza, chiunque conoscesse l'URL del progetto (che sta
 * dentro l'APK) potrebbe mandare notifiche a tutti gli utenti.
 *   - il database lo legge da public.app_secrets e lo manda nell'header
 *     x-push-secret ad ogni chiamata (vedi push_to_users);
 *   - qui va impostato come variabile d'ambiente PUSH_SHARED_SECRET
 *     (dashboard Supabase → Edge Functions → Secrets).
 * Se il segreto manca o non combacia la richiesta viene rifiutata: si sbaglia
 * verso "nessuna notifica", mai verso "notifiche a chiunque".
 */

type NewPayload = {
  userIds?: string[];
  title?: string;
  body?: string;
  url?: string;
};

type LegacyPayload = {
  userId?: string;
  orderId?: string;
  message?: string;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

/** Confronto a tempo costante: non lascia indovinare il segreto un byte alla volta. */
function secretMatches(received: string | null, expected: string): boolean {
  if (!received || received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Gate: solo chi conosce il segreto condiviso può far partire notifiche.
  const expectedSecret = Deno.env.get('PUSH_SHARED_SECRET');
  if (!expectedSecret) {
    // Segreto non configurato: si chiude, non si apre.
    return new Response('Push secret not configured', { status: 500 });
  }
  if (!secretMatches(req.headers.get('x-push-secret'), expectedSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Missing Supabase env', { status: 500 });
  }

  const raw = (await req.json().catch(() => ({}))) as NewPayload & LegacyPayload;

  // Normalizza il payload legacy nel formato nuovo.
  const userIds = raw.userIds ?? (raw.userId ? [raw.userId] : []);
  const title = raw.title ?? 'Nuovo messaggio';
  const body =
    raw.body ?? raw.message?.slice(0, 120) ?? 'Hai una novità su Beer to Beer.';
  const url = raw.url ?? (raw.orderId ? `/chat/${raw.orderId}` : '/');

  if (userIds.length === 0) {
    return new Response('Missing userIds', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const tokens = (data ?? []).map((row) => row.token as string);
  if (tokens.length === 0) {
    return Response.json({ sent: 0, failed: 0 });
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    channelId: 'messages',
    title,
    body: body.slice(0, 160),
    data: { url },
  }));

  let sent = 0;
  let failed = 0;
  const deadTokens: string[] = [];

  // Expo accetta max 100 messaggi per richiesta.
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const result = (await res.json()) as {
        data?: { status: string; details?: { error?: string } }[];
      };
      (result.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent += 1;
        } else {
          failed += 1;
          // Token non più valido (app disinstallata): lo togliamo dal DB.
          if (ticket.details?.error === 'DeviceNotRegistered') {
            deadTokens.push(batch[idx].to);
          }
        }
      });
    } catch {
      failed += batch.length;
    }
  }

  if (deadTokens.length > 0) {
    await supabase.from('push_tokens').delete().in('token', deadTokens);
  }

  return Response.json({ sent, failed });
});

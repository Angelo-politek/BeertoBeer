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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
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

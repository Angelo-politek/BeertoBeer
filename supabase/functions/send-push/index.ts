import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

type Payload = {
  userId?: string;
  orderId?: string;
  message?: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Missing Supabase env', { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as Payload;
  if (!body.userId) {
    return new Response('Missing userId', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from('push_tokens').select('token').eq('user_id', body.userId);
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const messages = (data ?? []).map((row) => ({
    to: row.token,
    sound: 'default',
    title: 'Nuovo messaggio',
    body: body.message?.slice(0, 120) || 'Hai ricevuto un messaggio su Beer to Beer.',
    data: { url: body.orderId ? `/chat/${body.orderId}` : '/' },
  }));

  if (messages.length === 0) {
    return Response.json({ sent: 0 });
  }

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  return Response.json({ sent: messages.length, expo: await expoResponse.json() });
});

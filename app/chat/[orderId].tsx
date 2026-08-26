import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChatView } from '@/components/chat-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GIRO } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { getMessages, getOrderEta, getRequestById, sendMessage, subscribeToMessages } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import type { BeerRequest, Message } from '@/types';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandIcon } from '@/components/ui/brand-icon';
import { STATO_LABEL } from '@/lib/orders';

/** Chat legata a un ordine: host e driver si coordinano sulla consegna. */
export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const c = useColors();
  const router = useRouter();
  const { session } = useSession();
  const myId = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<BeerRequest | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getMessages(orderId)
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch(() => {
        if (active) setError(GIRO.chat.nonCaricata);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    getRequestById(orderId).then(setRequest).catch(() => null);
    getOrderEta(orderId).then(setEta).catch(() => null);

    const unsubscribe = subscribeToMessages(orderId, (message) => {
      setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [orderId]);

  /**
   * Mostra subito il proprio messaggio, senza aspettare che rimbalzi dal tempo
   * reale: se quello è lento o non attivo, altrimenti si scrive e non si vede
   * niente. Stesso comportamento della chat diretta. Il controllo sull'id evita
   * il doppione quando poi l'evento arriva davvero.
   */
  async function handleSend(testo: string) {
    const inviato = await sendMessage(orderId, testo);
    if (inviato) {
      setMessages((current) => (current.some((m) => m.id === inviato.id) ? current : [...current, inviato]));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: GIRO.chat.titolo }} />
      {error ? <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText> : null}
      <ChatView
        messages={messages}
        myId={myId}
        loading={loading}
        emptyMessage={GIRO.chat.vuota}
        quickReplies={[...GIRO.chat.rapide]}
        header={request ? <PressableScale onPress={() => router.push({ pathname: '/request/[id]', params: { id: orderId } })} style={[styles.hub, { backgroundColor: c.accentSoft }]}><View style={styles.hubText}><ThemedText type="label">{GIRO.chat.intestazione(STATO_LABEL[request.stato])}</ThemedText><ThemedText style={{ color: c.textSecondary }}>{request.fascia ?? GIRO.chat.fasciaNonIndicata}{eta ? GIRO.chat.arrivoStimato(eta) : ''}</ThemedText></View><BrandIcon name="arrow-right" size={20} color={c.accent} /></PressableScale> : null}
        onSend={handleSend}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  error: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  hub: { minHeight: 68, borderRadius: 10, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hubText: { flex: 1, gap: 2 },
});

import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ChatView } from '@/components/chat-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PERSONE } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { getDirectMessages, getUserById, sendDirectMessage, subscribeToDirectMessages } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import type { Message, User } from '@/types';

/**
 * Chat diretta tra connessioni (persone con almeno uno scambio confermato
 * insieme), indipendente dagli ordini. La subscription riceve solo i messaggi
 * dell'altro; i propri invii vengono appesi localmente.
 */
export default function DirectChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const c = useColors();
  const { session } = useSession();
  const myId = session?.user.id;
  const [other, setOther] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!myId) return;
    let active = true;

    getUserById(userId)
      .then((u) => {
        if (active) setOther(u);
      })
      .catch(() => null);

    getDirectMessages(userId)
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch(() => {
        if (active) setError(PERSONE.chat.direttaNonCaricata);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = subscribeToDirectMessages(myId, userId, (message) => {
      setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, myId]);

  async function handleSend(testo: string) {
    const sent = await sendDirectMessage(userId, testo);
    if (sent) {
      setMessages((current) => (current.some((m) => m.id === sent.id) ? current : [...current, sent]));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: other?.nome ?? 'Chat' }} />
      {error ? <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText> : null}
      <ChatView
        messages={messages}
        myId={myId}
        loading={loading}
        emptyMessage={other?.nome ? PERSONE.chat.direttaVuota(other.nome) : PERSONE.chat.direttaVuotaSenzaNome}
        onSend={handleSend}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  error: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
});

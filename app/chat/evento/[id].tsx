import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ChatView } from '@/components/chat-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PERSONE } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { getEventById, getEventMessages, sendEventMessage } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import { messaggioServer } from '@/lib/errori';
import type { BeerEvent, Message } from '@/types';

/**
 * LA CHAT DEL GRUPPO.
 *
 * Segnalazione del collaudo: «quando gli altri utenti si uniscono devono poter
 * vedere la lista dei partecipanti [...] e magari accedere anche a una chat di
 * gruppo».
 *
 * Non e' una chat nuova: riusa `ChatView`, la stessa dei giri e dei messaggi
 * diretti, che gia' sa fare bolle, scorrimento automatico e separatori di
 * data. Qui cambia solo da dove arrivano i messaggi. Scriverne una seconda
 * avrebbe voluto dire due chat che col tempo si comportano in modo diverso —
 * ed e' esattamente il difetto che in questo progetto ho gia' rincorso tre
 * volte.
 *
 * Chi puo' scrivere lo decide il database, non questa schermata: le regole su
 * event_messages lasciano passare solo chi partecipa, e solo finche'
 * l'incontro e' aperto.
 */
export default function ChatEventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { session } = useSession();
  const myId = session?.user.id;

  const [evento, setEvento] = useState<BeerEvent | null>(null);
  const [messaggi, setMessaggi] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    try {
      const [e, m] = await Promise.all([getEventById(id), getEventMessages(id)]);
      setEvento(e);
      setMessaggi(m);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioServer(e, PERSONE.chat.gruppoNonDisponibile));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function invia(testo: string) {
    await sendEventMessage(id, testo);
    // Si ricarica invece di appendere a mano: in un gruppo, nel frattempo,
    // possono aver scritto anche gli altri.
    await carica();
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: evento?.titolo ?? PERSONE.chat.gruppoTitolo }} />
      {errore ? (
        <ThemedText style={[styles.errore, { color: c.danger }]}>{errore}</ThemedText>
      ) : null}
      <ChatView
        messages={messaggi}
        myId={myId}
        loading={loading}
        emptyMessage={PERSONE.chat.gruppoVuota}
        onSend={invia}
        quickReplies={[...PERSONE.chat.gruppoRapide]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errore: { padding: Spacing.md, textAlign: 'center' },
});

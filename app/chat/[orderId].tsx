import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getMessages, sendMessage, subscribeToMessages } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { useSession } from '@/lib/auth-context';
import type { Message } from '@/types';

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const c = useColors();
  const { session } = useSession();
  const myId = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMessages(orderId)
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch(() => {
        if (active) setError('Impossibile caricare la chat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = subscribeToMessages(orderId, (message) => {
      setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [orderId]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(orderId, text);
      setText('');
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Messaggio non inviato.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Chat ordine' }} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState title="Nessun messaggio" message="La conversazione dell'ordine apparira qui." />
            )
          }
          renderItem={({ item }) => {
            const mine = item.senderId === myId;
            return (
              <View style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}>
                {!mine ? <Avatar name={item.sender?.nome ?? 'Utente'} uri={item.sender?.fotoUrl} size={30} /> : null}
                <View style={[styles.bubble, { backgroundColor: mine ? c.chatOutgoing : c.chatIncoming }]}>
                  {!mine && item.sender?.nome ? (
                    <ThemedText type="defaultSemiBold" style={styles.sender}>
                      {item.sender.nome}
                    </ThemedText>
                  ) : null}
                  <ThemedText>{item.testo}</ThemedText>
                </View>
              </View>
            );
          }}
        />
        {error ? <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText> : null}
        <SafeAreaView edges={['bottom']} style={[styles.composer, { borderTopColor: c.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Messaggio"
            placeholderTextColor={c.textSecondary}
            multiline
            style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: c.accent, opacity: !canSend ? 0.45 : pressed ? 0.6 : 1 },
            ]}>
            <ThemedText type="defaultSemiBold" style={{ color: c.accentText }}>
              Invia
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flexGrow: 1, padding: Spacing.md, gap: Spacing.sm },
  messageRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 12, padding: Spacing.sm, gap: 2 },
  sender: { fontSize: 12 },
  composer: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1 },
  input: { flex: 1, maxHeight: 110, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  send: { alignSelf: 'flex-end', height: 42, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  error: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
});

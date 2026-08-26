import { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandIcon } from '@/components/ui/brand-icon';
import { GIRO } from '@/constants/testi';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';
import type { Message } from '@/types';

/** Separatore mostrato quando tra due messaggi passano più di 15 minuti. */
const TIME_GAP_MS = 15 * 60 * 1000;

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? time : `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}, ${time}`;
}

type Props = {
  messages: Message[];
  myId?: string;
  loading: boolean;
  emptyMessage: string;
  /** Invia il testo; lancia in caso di errore (l'input non viene svuotato). */
  onSend: (testo: string) => Promise<void>;
  quickReplies?: string[];
  header?: React.ReactNode;
};

/**
 * UI condivisa delle chat (per-ordine e diretta): bolle, autoscroll,
 * separatori temporali e composer. La sorgente dati la fornisce il chiamante.
 */
export function ChatView({ messages, myId, loading, emptyMessage, onSend, quickReplies, header }: Props) {
  const c = useColors();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text);
      setText('');
    } catch (e) {
      // Il messaggio vero del server, se c'e': dice cosa fare, la riserva no.
      setError(messaggioServer(e, GIRO.chat.nonInviato));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => {
          if (messages.length > 0) listRef.current?.scrollToEnd({ animated: true });
        }}
        ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : null}
        ListEmptyComponent={loading ? null : <EmptyState title={GIRO.chat.nessunMessaggio} message={emptyMessage} />}
        renderItem={({ item, index }) => {
          const mine = item.senderId === myId;
          const prev = index > 0 ? messages[index - 1] : null;
          const showTime =
            !prev || new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime() > TIME_GAP_MS;
          return (
            <>
              {showTime ? (
                <ThemedText style={[styles.timeLabel, { color: c.textSecondary }]}>
                  {formatTimeLabel(item.createdAt)}
                </ThemedText>
              ) : null}
              <View style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}>
                {!mine ? <Avatar name={item.sender?.nome ?? 'Utente'} uri={item.sender?.fotoUrl} size={30} /> : null}
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.mineBubble : styles.theirBubble,
                    { backgroundColor: mine ? c.chatOutgoing : c.chatIncoming },
                  ]}>
                  {!mine && item.sender?.nome ? (
                    <ThemedText type="defaultSemiBold" style={styles.sender}>
                      {item.sender.nome}
                    </ThemedText>
                  ) : null}
                  <ThemedText>{item.testo}</ThemedText>
                </View>
              </View>
            </>
          );
        }}
      />
      {error ? <ThemedText style={[styles.error, { color: c.danger }]}>{error}</ThemedText> : null}
      {quickReplies?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplies}>{quickReplies.map((reply) => <PressableScale key={reply} onPress={() => setText(reply)} style={[styles.quickReply, { backgroundColor: c.surfaceAlt }]}><ThemedText type="caption">{reply}</ThemedText></PressableScale>)}</ScrollView> : null}
      <SafeAreaView edges={['bottom']} style={[styles.composer, { borderTopColor: c.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Messaggio"
          placeholderTextColor={c.textSecondary}
          multiline
          style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]}
        />
        <PressableScale
          onPress={handleSend}
          disabled={!canSend}
          pressedScale={0.9}
          style={[styles.send, { backgroundColor: c.accent, opacity: !canSend ? 0.45 : 1 }]}>
          <BrandIcon name="send-arrow" size={20} color={c.accentText} />
        </PressableScale>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flexGrow: 1, padding: Spacing.md, gap: Spacing.sm },
  messageRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  mineRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: Radii.lg, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  mineBubble: { borderBottomRightRadius: 6 },
  theirBubble: { borderBottomLeftRadius: 6 },
  sender: { fontSize: 12 },
  timeLabel: { alignSelf: 'center', fontSize: 12, marginVertical: Spacing.xs },
  composer: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 110, borderRadius: Radii.lg, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16 },
  send: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
  header: { marginBottom: Spacing.sm },
  quickReplies: { gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  quickReply: { minHeight: 36, borderRadius: 8, paddingHorizontal: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
});

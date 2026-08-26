import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { StarRating } from '@/components/star-rating';
import { useToast } from '@/components/toast';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { COMPLIMENTS } from '@/constants/compliments';
import { GIRO } from '@/constants/testi';
import { Spacing } from '@/constants/theme';
import { getReviewContext, sendCompliment, submitReview, type ReviewContext } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { messaggioServer } from '@/lib/errori';

export default function ReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [rating, setRating] = useState(5);
  const [puntualita, setPuntualita] = useState(5);
  const [comunicazione, setComunicazione] = useState(5);
  const [rispetto, setRispetto] = useState(5);
  const [comment, setComment] = useState('');
  const [compliment, setCompliment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getReviewContext(orderId)
      .then((ctx) => {
        if (!active) return;
        setContext(ctx);
        if (ctx?.existingReview) {
          setRating(ctx.existingReview.voto);
          setComment(ctx.existingReview.commento ?? '');
        }
      })
      .catch(() => {
        if (active) setError(GIRO.recensione.nonCaricata);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await submitReview(orderId, rating, comment, { puntualita, comunicazione, rispetto });
      // Complimento (best-effort: non deve bloccare il salvataggio recensione).
      if (compliment && context) {
        // Un complimento che sparisce in silenzio fa credere di averlo mandato.
        await sendCompliment(orderId, context.target.id, compliment).catch(() => {
          toast.show(GIRO.recensione.complimentoNonPartito, 'error');
        });
      }
      toast.show(GIRO.recensione.salvata);
      router.back();
    } catch (e) {
      // Il messaggio vero del server, se c'e': una frase di riserva al suo
      // posto costa due volte — a chi legge e a chi deve trovare il difetto.
      setError(messaggioServer(e, GIRO.recensione.nonSalvata));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: GIRO.recensione.titoloBreve }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!context) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: GIRO.recensione.titoloBreve }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">{GIRO.recensione.nonDisponibile}</ThemedText>
          {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: GIRO.recensione.titolo }} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Avatar name={context.target.nome} uri={context.target.fotoUrl} size={82} />
            {/* type="nome" e non "title": «title» e' maiuscolo, e il nome di
                chi hai appena incontrato non si urla. */}
            <ThemedText type="nome">{context.target.nome}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{GIRO.recensione.comeAndata}</ThemedText>
          </View>
          <View style={styles.ratingWrap}>
            <StarRating value={rating} onChange={setRating} size={42} />
          </View>
          <View style={styles.dimensions}>
            <Dimension label={GIRO.recensione.puntualita} value={puntualita} onChange={setPuntualita} />
            <Dimension label={GIRO.recensione.comunicazione} value={comunicazione} onChange={setComunicazione} />
            <Dimension label={GIRO.recensione.rispetto} value={rispetto} onChange={setRispetto} />
          </View>

          <View style={styles.field}>
            <ThemedText type="defaultSemiBold">{GIRO.recensione.complimento}</ThemedText>
            <View style={styles.chips}>
              {COMPLIMENTS.map((comp) => {
                const active = compliment === comp.key;
                return (
                  <Chip
                    key={comp.key}
                    label={comp.label}
                    active={active}
                    onPress={() => setCompliment(active ? null : comp.key)}
                  />
                );
              })}
            </View>
          </View>

          <TextField
            label={GIRO.recensione.commento}
            value={comment}
            onChangeText={setComment}
            placeholder={GIRO.recensione.commentoSegnaposto}
            multiline
          />
          {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}
          <Button label={GIRO.recensione.salva} onPress={handleSubmit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md },
  content: { padding: Spacing.md, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.lg },
  ratingWrap: { alignItems: 'center' },
  field: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dimensions: { gap: Spacing.md },
});

function Dimension({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <View style={styles.field}><ThemedText type="defaultSemiBold">{label}</ThemedText><StarRating value={value} onChange={onChange} size={28} /></View>;
}

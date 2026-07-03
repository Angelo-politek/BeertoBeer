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
import { Spacing } from '@/constants/theme';
import { getReviewContext, submitReview, type ReviewContext } from '@/data/api';
import { useColors } from '@/hooks/use-colors';

export default function ReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
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
        if (active) setError('Impossibile caricare la recensione.');
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
      await submitReview(orderId, rating, comment);
      toast.show('Recensione salvata');
      router.back();
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Recensione non salvata.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Recensione' }} />
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!context) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Recensione' }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">Recensione non disponibile</ThemedText>
          {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Lascia recensione' }} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Avatar name={context.target.nome} uri={context.target.fotoUrl} size={82} />
            <ThemedText type="title">{context.target.nome}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>Com’è andato lo scambio?</ThemedText>
          </View>
          <View style={styles.ratingWrap}>
            <StarRating value={rating} onChange={setRating} size={42} />
          </View>
          <TextField
            label="Commento"
            value={comment}
            onChangeText={setComment}
            placeholder="Racconta com'è andata"
            multiline
          />
          {error ? <ThemedText style={{ color: c.danger }}>{error}</ThemedText> : null}
          <Button label="Salva recensione" onPress={handleSubmit} loading={saving} />
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
});

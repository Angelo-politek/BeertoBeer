import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getRequestById } from '@/data/api';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const router = useRouter();
  const request = getRequestById(id);

  if (!request) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Richiesta' }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">Richiesta non trovata</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const { host } = request;

  function handleAccept() {
    Alert.alert(
      'Accetta consegna',
      'In questa demo (Fase 0) l’accettazione non è ancora attiva. Arriverà nella Fase 1 con il backend reale.',
      [{ text: 'Ok' }],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Dettaglio richiesta' }} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profilo host (toccabile → apre il profilo) */}
        <Pressable
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: host.id } })}
          style={({ pressed }) => [styles.hostRow, { opacity: pressed ? 0.6 : 1 }]}>
          <Avatar name={host.nome} size={56} />
          <View style={styles.hostInfo}>
            <ThemedText type="subtitle">{host.nome}</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {host.eta} anni · ⭐ {host.ratingMedio.toFixed(1)} · {host.scambiCompletati} scambi
            </ThemedText>
          </View>
          <ThemedText style={{ color: c.textSecondary }}>›</ThemedText>
        </Pressable>
        {host.bio ? (
          <ThemedText style={[styles.bio, { color: c.textSecondary }]}>{host.bio}</ThemedText>
        ) : null}

        {/* Banner vibe mode */}
        {request.vibeMode ? (
          <View style={[styles.vibeBanner, { backgroundColor: c.accentSoft, borderColor: c.accent }]}>
            <ThemedText type="defaultSemiBold" style={{ color: c.accent }}>
              ✨ Vibe mode attiva
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>
              {host.nome} ti invita a fermarti a bere insieme una volta consegnate le birre. È sempre
              facoltativo: puoi anche consegnare e andare via.
            </ThemedText>
          </View>
        ) : null}

        {/* Birre richieste */}
        <Section title="Birre richieste">
          {request.birre.map((b, i) => (
            <View
              key={b.nome}
              style={[
                styles.beerRow,
                i < request.birre.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
              ]}>
              <ThemedText>{b.nome}</ThemedText>
              <ThemedText type="defaultSemiBold">{b.quantita}×</ThemedText>
            </View>
          ))}
        </Section>

        {/* Consegna */}
        <Section title="Consegna">
          <ThemedText>{request.indirizzo}</ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{request.distanzaKm.toFixed(1)} km da te</ThemedText>
        </Section>

        {/* Crediti */}
        <Section title="Ricompensa">
          <ThemedText type="title" style={{ color: c.accent }}>
            {request.creditiOfferti} crediti
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>
            Più il rimborso esatto della spesa, al momento della consegna.
          </ThemedText>
        </Section>
      </ScrollView>

      {/* Footer con il bottone (solo UI in Fase 0) */}
      <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        <Button label="Accetta consegna" onPress={handleAccept} />
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  hostInfo: {
    flex: 1,
    gap: 2,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
  },
  vibeBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  beerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});

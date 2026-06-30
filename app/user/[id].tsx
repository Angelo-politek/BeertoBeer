import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getCurrentUser, getUserById } from '@/data/api';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const user = getUserById(id);
  const isMe = id === getCurrentUser().id;

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Profilo' }} />
        <View style={styles.center}>
          <ThemedText type="subtitle">Utente non trovato</ThemedText>
        </View>
      </ThemedView>
    );
  }

  function handleReport() {
    Alert.alert(
      'Segnala utente',
      `In questa demo (Fase 0) la segnalazione di ${user!.nome} non è ancora attiva. Arriverà nella Fase 1 con motivazioni predefinite e moderazione.`,
      [{ text: 'Annulla', style: 'cancel' }, { text: 'Segnala', style: 'destructive' }],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: user.nome }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar name={user.nome} size={88} />
          <ThemedText type="title" style={styles.name}>
            {user.nome}
          </ThemedText>
          <ThemedText style={{ color: c.textSecondary }}>{user.eta} anni</ThemedText>
        </View>

        <View style={[styles.statsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.stat}>
            <ThemedText type="title" style={styles.statValue}>
              ⭐ {user.ratingMedio.toFixed(1)}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>Rating</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.stat}>
            <ThemedText type="title" style={styles.statValue}>
              {user.scambiCompletati}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>Scambi</ThemedText>
          </View>
        </View>

        {user.bio ? (
          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="defaultSemiBold">Bio</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.bio}</ThemedText>
          </View>
        ) : null}

        {user.preferenzeBirra ? (
          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="defaultSemiBold">Preferenze birra</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.preferenzeBirra}</ThemedText>
          </View>
        ) : null}

        {!isMe ? <Button label="Segnala utente" variant="danger" onPress={handleReport} /> : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  name: { marginTop: Spacing.xs },
  statsCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: Spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 28, lineHeight: 34 },
  statDivider: { width: 1 },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});

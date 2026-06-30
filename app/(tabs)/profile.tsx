import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { getCurrentUser } from '@/data/api';

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();
  const user = getCurrentUser();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Intestazione profilo */}
          <View style={styles.header}>
            <Avatar name={user.nome} size={88} />
            <ThemedText type="title" style={styles.name}>
              {user.nome}
            </ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.eta} anni</ThemedText>
          </View>

          {/* Statistiche */}
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
              <ThemedText style={{ color: c.textSecondary }}>Consegne</ThemedText>
            </View>
          </View>

          {/* Bio */}
          <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ThemedText type="defaultSemiBold">Bio</ThemedText>
            <ThemedText style={{ color: c.textSecondary }}>{user.bio}</ThemedText>
          </View>

          {/* Preferenze birra */}
          {user.preferenzeBirra ? (
            <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <ThemedText type="defaultSemiBold">Preferenze birra</ThemedText>
              <ThemedText style={{ color: c.textSecondary }}>{user.preferenzeBirra}</ThemedText>
            </View>
          ) : null}

          {/* Modifica profilo */}
          <Button label="Modifica profilo" variant="secondary" onPress={() => router.push('/edit-profile')} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  name: {
    marginTop: Spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: Spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  statDivider: {
    width: 1,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});

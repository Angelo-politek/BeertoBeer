import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BrandIcon } from '@/components/ui/brand-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { velo } from '@/constants/motion';
import { Spacing } from '@/constants/theme';

/**
 * UNA FOTO A SCHERMO INTERO.
 *
 * Segnalazione del collaudo: «le foto devono essere visibili e apribili».
 * Erano visibili ma grandi come un francobollo e non si aprivano: su un
 * profilo che si guarda per decidere se far entrare qualcuno in casa, o se
 * andare a casa di qualcuno, e' esattamente la cosa che si vuole guardare
 * bene.
 *
 * Si chiude toccando ovunque: e' il gesto che la gente prova per primo.
 */

type Props = {
  uri: string | null;
  /** Posizione nell'insieme, per dire «2 di 4». */
  indice?: number;
  totale?: number;
  onClose: () => void;
  onScorri?: (avanti: boolean) => void;
};

export function FotoIntera({ uri, indice, totale, onClose, onScorri }: Props) {
  if (!uri) return null;

  const puoScorrere = onScorri != null && totale != null && totale > 1 && indice != null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={velo} style={styles.pieno}>
        <Pressable style={styles.pieno} onPress={onClose}>
          <SafeAreaView style={styles.pieno} edges={['top', 'bottom']}>
            <View style={styles.barra}>
              {puoScorrere ? (
                <ThemedText style={{ color: '#F4F1EA' }}>{`${(indice ?? 0) + 1} di ${totale}`}</ThemedText>
              ) : (
                <View />
              )}
              <PressableScale onPress={onClose} hitSlop={12} style={styles.chiudi}>
                <BrandIcon name="x-mark" size={22} color="#F4F1EA" />
              </PressableScale>
            </View>

            <Image source={{ uri }} style={styles.foto} contentFit="contain" />

            {puoScorrere ? (
              <View style={styles.frecce}>
                <PressableScale onPress={() => onScorri?.(false)} hitSlop={12} style={styles.freccia}>
                  <BrandIcon name="arrow-left" size={26} color="#F4F1EA" />
                </PressableScale>
                <PressableScale onPress={() => onScorri?.(true)} hitSlop={12} style={styles.freccia}>
                  <BrandIcon name="arrow-right" size={26} color="#F4F1EA" />
                </PressableScale>
              </View>
            ) : (
              <View style={styles.frecce} />
            )}
          </SafeAreaView>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Nero pieno e non il velo del tema: una foto si guarda meglio senza niente
  // attorno che la disturbi.
  pieno: { flex: 1, backgroundColor: '#000000' },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chiudi: { padding: Spacing.xs },
  foto: { flex: 1, width: '100%' },
  frecce: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  freccia: { padding: Spacing.sm },
});

import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { INGRESSO } from '@/constants/testi';
import { Radii, Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import type { Invite } from '@/types';

/**
 * LA TESSERA.
 *
 * L'invito era un codice in una riga di testo, in mezzo ad altre righe di
 * testo. Ma è la cosa più preziosa che una persona ha qui dentro — ne ha una
 * sola, e quando la spende è spesa — e non sembrava niente.
 *
 * Adesso è un oggetto: una tessera nera con il bordo giallo, il wordmark in
 * alto, il codice in Bebas grande abbastanza da leggersi a un braccio di
 * distanza, e il nome di chi hai scelto scritto sopra come su un biglietto
 * nominativo. Chi guarda lo schermo capisce che sta tenendo qualcosa.
 *
 * Regole visive rispettate senza inventare niente: un solo accento (il giallo,
 * e solo sul bordo e sul codice), superficie del tema, nessuna ombra, nessun
 * gradiente. La texture di carta strappata è uno degli «elementi di rottura»
 * che la brand bible nomina — sta dietro l'intestazione, mai sotto il codice,
 * che deve restare leggibile.
 *
 * Tre stati, e si distinguono a colpo d'occhio:
 *   libera   — bordo giallo, codice pieno
 *   spesa    — bordo spento, codice barrato, e il nome di chi è entrato
 *   ritirata — bordo rosso: l'ha tolta l'amministrazione
 */
export function TesseraInvito({
  invito,
  onPress,
}: {
  invito: Invite;
  onPress?: () => void;
}) {
  const c = useColors();

  const spesa = invito.usato;
  const ritirata = invito.revocato && !invito.usato;
  const bordo = ritirata ? c.danger : spesa ? c.border : c.accent;
  const inchiostro = ritirata ? c.danger : spesa ? c.textSecondary : c.accent;

  const contenuto = (
    <View style={[styles.tessera, { backgroundColor: c.surface, borderColor: bordo }]}>
      <View style={styles.intestazione}>
        <Image
          source={require('../assets/brand/wordmark.png')}
          style={styles.wordmark}
          contentFit="contain"
        />
        <ThemedText type="caption" style={{ color: c.textSecondary }}>
          {ritirata ? INGRESSO.invito.tessera.ritirato : spesa ? INGRESSO.invito.tessera.speso : INGRESSO.invito.tessera.unPosto}
        </ThemedText>
      </View>

      {/* Il nome sta SOPRA il codice: è la parte che rende la tessera tua e
          non di chiunque. Se non c'è, si invita a scriverlo. */}
      {invito.nominativo ? (
        <ThemedText type="subtitle" numberOfLines={1}>
          {invito.nominativo}
        </ThemedText>
      ) : spesa ? null : (
        <ThemedText style={{ color: c.textSecondary }}>{INGRESSO.invito.tessera.aChi}</ThemedText>
      )}

      <ThemedText
        type="display"
        style={[styles.codice, { color: inchiostro }, spesa ? styles.barrato : null]}>
        {invito.code}
      </ThemedText>

      <View style={[styles.piede, { borderTopColor: c.border }]}>
        <ThemedText type="caption" style={{ color: c.textSecondary }}>
          {spesa
            ? invito.invitato
              ? INGRESSO.invito.tessera.entrato(invito.invitato)
              : INGRESSO.invito.tessera.giaSpeso
            : ritirata
              ? INGRESSO.invito.tessera.nonPiuValido
              : INGRESSO.invito.tessera.valeUnaPersona}
        </ThemedText>
      </View>
    </View>
  );

  if (!onPress || spesa || ritirata) return contenuto;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={INGRESSO.invito.tessera.modificaInvito}>
      {contenuto}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tessera: {
    borderWidth: 1.5,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: 6,
  },
  intestazione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: { width: 92, height: 22 },
  codice: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: 2,
  },
  barrato: { textDecorationLine: 'line-through' },
  piede: { borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
});

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { esaminaData, ETA_MINIMA, formattaData } from '@/lib/age';
import { useColors } from '@/hooks/use-colors';

/**
 * LA DATA DI NASCITA.
 *
 * Segnalazione del collaudo (Alessio): «migliorare casella per data di nascita
 * nella schermata di registrazione».
 *
 * Prima era un campo di testo libero con «GG/MM/AAAA» scritto nel segnaposto.
 * Tre problemi, tutti a carico di chi si iscrive:
 *   - chi scriveva 24-12-1999 o 24 12 1999 si vedeva rifiutare una data giusta;
 *   - l'errore arrivava solo dopo aver premuto «Crea account», quindi
 *     bisognava tornare indietro e rileggere tutto il modulo;
 *   - il messaggio era sempre lo stesso, sia per una data inesistente sia per
 *     chi era minorenne — due cose completamente diverse.
 *
 * PERCHE' NON UNA RUOTA DI SELEZIONE. Un selettore di date nativo
 * obbligherebbe a ricompilare l'APK e a farlo reinstallare a tutti, e per una
 * data di nascita far scorrere sessant'anni di anni e' piu' lento che
 * scriverli. Qui le cifre le scrive l'utente e le barre le mette l'app.
 */

type Props = {
  value: string;
  onChangeText: (formattata: string) => void;
};

export function BirthdateField({ value, onChangeText }: Props) {
  const c = useColors();
  const esito = esaminaData(value);

  return (
    <>
      <TextField
        label="Data di nascita"
        value={value}
        onChangeText={(grezzo) => onChangeText(formattaData(grezzo))}
        placeholder="GG/MM/AAAA"
        keyboardType="number-pad"
        autoCapitalize="none"
        error={
          esito.stato === 'non-valida'
            ? esito.motivo
            : esito.stato === 'troppo-giovane'
              ? `Devi avere almeno ${ETA_MINIMA} anni per usare Beer to Beer.`
              : null
        }
      />
      {/* Conferma silenziosa: chi ha scritto la data giusta vede subito che
          l'app l'ha capita, e non deve piu' chiedersi se il formato va bene. */}
      {esito.stato === 'ok' ? (
        <ThemedText type="caption" style={{ color: c.textSecondary }}>
          {`${esito.anni} anni compiuti.`}
        </ThemedText>
      ) : null}
    </>
  );
}

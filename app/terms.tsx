import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

/**
 * Regole della community, termini e privacy.
 *
 * Esisteva l'obbligo di accettarle in onboarding ("Accetto le regole della
 * community") ma non esisteva un posto dove leggerle: si chiedeva alle persone
 * di firmare qualcosa di invisibile.
 *
 * ATTENZIONE: è una stesura pensata per la beta chiusa, non un parere legale.
 * Prima di aprire al pubblico va fatta rivedere a un legale, soprattutto per le
 * normative su alcol e responsabilità in caso di incidenti.
 */
export default function TermsScreen() {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Regole e privacy' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ThemedText type="label">BEER TO BEER</ThemedText>
          <ThemedText type="title">LE REGOLE, IN CHIARO</ThemedText>
          <ThemedText style={styles.intro}>
            Poche cose, scritte in modo che si capiscano. Se una di queste non ti convince, meglio
            saperlo adesso che a metà di un giro.
          </ThemedText>
        </View>

        <Regola titolo="1 · Non vendiamo alcolici">
          Beer to Beer non compra, non vende e non somministra alcol, e non trattiene commissioni.
          Chi porta acquista al negozio; lo scambio avviene fra due privati che si accordano fra
          loro. L&apos;app serve solo a farvi incontrare.
        </Regola>

        <Regola titolo="2 · I BeerCoin non sono soldi">
          Si guadagnano portando e si spendono chiedendo. Non si comprano, non si trasferiscono, non
          si convertono in denaro e non danno diritto a rimborsi. Il rimborso della spesa reale
          avviene direttamente fra voi due, fuori dall&apos;app.
        </Regola>

        <Regola titolo="3 · Solo maggiorenni">
          Serve avere almeno 18 anni. Dichiarando la tua data di nascita te ne assumi la
          responsabilità. È vietato chiedere o consegnare alcolici a minorenni o a chi è
          palesemente ubriaco.
        </Regola>

        <Regola titolo="4 · Incontrare sconosciuti">
          La vibe mode significa incontrare una persona che non conosci. Partecipi con la tua testa
          e il tuo buon senso. L&apos;indirizzo esatto è visibile solo a chi ha accettato il giro, la
          consegna si chiude con un codice o con la conferma di vicinanza, e puoi uscire da un giro
          in qualsiasi momento senza dare spiegazioni.
        </Regola>

        <Regola titolo="5 · Come ci si comporta">
          Niente molestie, insulti, discriminazioni, insistenza o uso commerciale della piattaforma.
          Chi si comporta male viene sospeso o rimosso. Puoi bloccare chiunque: chi blocchi non vede
          più le tue richieste e non può accettarle.
        </Regola>

        <Regola titolo="6 · Moderazione">
          Una richiesta segnalata viene nascosta in attesa di verifica e il suo autore non può
          pubblicarne di nuove nel frattempo. Le segnalazioni infondate ripetute sono a loro volta un
          comportamento scorretto.
        </Regola>

        <Regola titolo="7 · Responsabilità">
          Il progetto è offerto così com&apos;è, senza scopo di lucro e senza garanzie. Chi lo
          mantiene non risponde di ciò che accade fra gli utenti né di danni derivanti dall&apos;uso
          o dal mancato funzionamento del servizio. Mettersi alla guida dopo aver bevuto è
          responsabilità esclusiva di chi lo fa.
        </Regola>

        <View style={styles.section}>
          <ThemedText type="label">PRIVACY</ThemedText>
          <ThemedText type="title">CHI VEDE COSA</ThemedText>
        </View>

        <Regola titolo="Cosa raccogliamo">
          Nome, data di nascita, email e ciò che scegli di aggiungere al profilo (foto, frase, gusti,
          disponibilità). Per ogni giro: indirizzo, coordinate e messaggi. Se attivi le notifiche, un
          identificativo del dispositivo. Durante una consegna in corso, la posizione dei due
          partecipanti, per permettere la conferma di vicinanza.
        </Regola>

        <Regola titolo="Chi vede cosa">
          Il tuo profilo pubblico — nome, età, foto, frase, rating, recensioni, livello, badge — è
          visibile agli altri iscritti. Le foto della vetrina seguono l&apos;impostazione che scegli
          tu. L&apos;indirizzo esatto lo vede solo chi ha accettato il tuo giro. Email, data di
          nascita esatta e saldo BeerCoin non sono mai pubblici.
        </Regola>

        <Regola titolo="Come li usiamo">
          Solo per far funzionare il servizio. Non vendiamo dati, non facciamo pubblicità, non li
          cediamo a terzi. Sono ospitati su Supabase. Gli amministratori possono vedere i giri attivi
          e le segnalazioni per la sicurezza della community, e ogni loro intervento resta tracciato.
        </Regola>

        <Regola titolo="Cancellazione">
          Puoi chiedere in qualsiasi momento la cancellazione dell&apos;account e dei tuoi dati a chi
          gestisce il progetto.
        </Regola>

        <Card>
          <ThemedText type="caption">
            Versione per la beta chiusa. Verrà rivista prima di qualsiasi apertura al pubblico.
          </ThemedText>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

function Regola({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <Card style={styles.regola}>
      <ThemedText type="defaultSemiBold">{titolo}</ThemedText>
      <ThemedText style={{ color: c.textSecondary, lineHeight: 22 }}>{children}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  intro: { marginTop: Spacing.xs, lineHeight: 22 },
  section: { marginTop: Spacing.md },
  regola: { gap: Spacing.xs },
});

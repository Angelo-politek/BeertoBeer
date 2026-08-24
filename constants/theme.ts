/**
 * DESIGN SYSTEM — Brand Identity v1.0 "Beer to Beer".
 *
 * Underground, urbano, DIY: sfondo quasi nero (#0F0F0F), un solo accento
 * (Beer Yellow #F6B21A), testi in Dirty White. Card semplici (#171717) senza
 * bordi né ombre, tipografia enorme in Bebas Neue, corpo in Inter.
 * L'app è SOLO dark: entrambe le chiavi della palette puntano agli stessi
 * valori, così ogni superficie resta nera qualunque sia il tema di sistema.
 */

const Palette = {
  text: '#F4F1EA',
  textSecondary: '#9B9B93',
  /** nero fotocopia, mai grigio chiaro */
  background: '#0F0F0F',
  surface: '#171717',
  /** superficie alternativa (chip, righe zebrate, input) */
  surfaceAlt: '#1F1F1F',
  border: '#262626',
  /** Beer Yellow: l'unico vero colore dell'app */
  accent: '#F6B21A',
  accentStrong: '#FFC53D',
  accentText: '#0F0F0F',
  accentSoft: '#2B220C',
  /** Brick Red: warning/danger (variante leggibile su nero) */
  danger: '#E0604F',
  /** Brick Red pieno, per bottoni/superfici danger */
  dangerStrong: '#B53A2D',
  dangerSoft: '#2E1512',
  /** Bottle Green: success (variante leggibile su nero) */
  positive: '#7CC98B',
  positiveSoft: '#18281C',
  chatIncoming: '#1F1F1F',
  chatOutgoing: '#2B220C',
  skeletonBase: '#1C1C1C',
  skeletonHighlight: '#292929',
  star: '#F6B21A',
  starMuted: '#3A3A3A',
  overlay: 'rgba(0, 0, 0, 0.72)',
  shadow: '#000000',
  tint: '#F6B21A',
  icon: '#9B9B93',
  tabIconDefault: '#7A7A7A',
  tabIconSelected: '#F6B21A',
} as const;

export const Colors = {
  light: Palette,
  dark: Palette,
};

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Angoli asciutti: arrotondati solo dove serve, mai "bubble" da startup. */
export const Radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

/**
 * Ombre quasi assenti: sul nero l'elevazione la fa il colore della superficie.
 * `raised` resta appena percettibile per modali e fogli sopra il contenuto.
 */
export function shadows(_scheme: 'light' | 'dark') {
  return {
    /** card in lista: nessuna ombra, solo superficie #171717 */
    card: {
      shadowOpacity: 0,
      elevation: 0,
    },
    /** modali, sheet, tab bar */
    raised: {
      shadowColor: Palette.shadow,
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    /** pulsanti primari e FAB: niente glow, il giallo pieno basta */
    fab: {
      shadowOpacity: 0,
      elevation: 0,
    },
  } as const;
}

/**
 * IL MOVIMENTO DELL'APP.
 *
 * COSA NON ANDAVA (segnalazione del collaudo: «le animazioni fanno davvero
 * schifo, alcune sembrano a rallentatore»). Non era una questione di gusto,
 * era misurabile: ogni card entrava con una cascata di 55 ms per posizione
 * fino a otto posizioni — 440 ms prima che comparisse l'ultima — e con una
 * molla che superava il punto d'arrivo e ci tornava sopra. In una lista, con
 * l'animazione che ripartiva a ogni ritorno sulla schermata, l'effetto era
 * un'app che ondeggia e arranca.
 *
 * LE REGOLE ORA
 * 1. Il movimento serve a spiegare da dove arriva una cosa, non a far vedere
 *    che c'è un'animazione.
 * 2. Niente rimbalzi sugli ingressi: una molla che sfora comunica «elastico»,
 *    e a leggere un elenco non serve.
 * 3. Sotto i 200 ms si percepisce come istantaneo. È lì che deve stare quasi
 *    tutto.
 * 4. Le cascate costano attesa: al massimo tre elementi, e solo la prima volta.
 */

/** Durate in millisecondi. Sopra i 260 ms si comincia ad aspettare. */
export const Durations = {
  /** cambi di stato immediati: colore, opacità, comparsa di un'etichetta */
  instant: 120,
  /** il caso normale: ingressi, uscite, transizioni interne */
  base: 180,
  /** solo per superfici grandi che entrano da fuori (fogli, modali) */
  large: 260,
} as const;

/**
 * Cascata delle liste: prima erano 8 elementi × 55 ms = 440 ms di attesa.
 * Tre elementi bastano a far leggere il movimento come «arrivano», e finisce
 * in 75 ms.
 */
export const Stagger = {
  step: 25,
  maxItems: 3,
} as const;

/**
 * Molle per le micro-interazioni (reanimated).
 *
 * `press` è l'unica che si usa spesso: è l'unico posto dove una molla ha senso,
 * perché il dito è ancora sullo schermo e il rimbalzo è la risposta fisica al
 * tocco. Gli ingressi NON usano molle.
 */
export const Springs = {
  /**
   * Feedback al tocco: quasi criticamente smorzata. Va e torna, non oscilla.
   * (damping 30 contro un valore critico di ~31,7: nessun sorpasso visibile.)
   */
  press: { damping: 30, stiffness: 420, mass: 0.6 },
  /** trascinamenti e riposizionamenti: morbida, ma senza tornare indietro */
  gentle: { damping: 30, stiffness: 260, mass: 0.9 },
  /**
   * Rimbalzo vero, per il singolo elemento che deve attirare l'occhio (un
   * contatore che cambia, una conferma). Mai su liste, mai su ingressi.
   */
  bouncy: { damping: 14, stiffness: 300, mass: 0.8 },
} as const;

/**
 * Famiglie tipografiche del brand (caricate in app/_layout.tsx con expo-font).
 * `display` = Bebas Neue, SEMPRE maiuscolo, per titoli e numeri enormi.
 * Le varianti Inter sono file statici: usare la famiglia giusta, MAI
 * `fontWeight` insieme a queste (su Android produce faux-bold).
 */
export const Fonts = {
  display: 'BebasNeue',
  sans: 'Inter',
  sansMedium: 'Inter-Medium',
  sansSemiBold: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
  sansBlack: 'Inter-Black',
} as const;

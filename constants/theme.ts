/**
 * DESIGN SYSTEM — "Craft & Warm".
 *
 * Palette ispirata alla birra: carta calda e ambra in light, "stout" scuro
 * caldo in dark. Le card sono superfici elevate (ombra morbida + raggio
 * generoso) invece che riquadri bordati. Qui vivono anche i token di
 * spaziatura, raggio, ombra, tipografia e le molle standard per le animazioni.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1D1712',
    textSecondary: '#77695A',
    /** carta calda, non bianco freddo */
    background: '#F8F4ED',
    surface: '#FFFFFF',
    /** superficie alternativa (chip, righe zebrate, input) */
    surfaceAlt: '#F1EAE0',
    border: '#EBE3D6',
    /** ambra: il colore della birra al sole */
    accent: '#D07C0C',
    accentStrong: '#A85F05',
    accentText: '#FFFFFF',
    accentSoft: '#F9EDD8',
    /** blu Nastro Azzurro Peroni: accento secondario per elementi "brand" */
    peroniBlue: '#0A3D91',
    danger: '#CE3B2C',
    dangerSoft: '#FBEAE7',
    positive: '#2E7D46',
    positiveSoft: '#E7F4EB',
    chatIncoming: '#F1EAE0',
    chatOutgoing: '#E2F2E4',
    skeletonBase: '#EDE6DA',
    skeletonHighlight: '#F7F3EB',
    star: '#F5A623',
    starMuted: '#DDD5C8',
    overlay: 'rgba(24, 16, 6, 0.45)',
    shadow: '#5C4013',
    tint: '#D07C0C',
    icon: '#77695A',
    tabIconDefault: '#9A8D7D',
    tabIconSelected: '#D07C0C',
  },
  dark: {
    text: '#F2EDE4',
    textSecondary: '#A89B89',
    /** stout: nero caldo, mai grigio freddo */
    background: '#131009',
    surface: '#1E1910',
    surfaceAlt: '#292217',
    border: '#332B1D',
    accent: '#F0A63C',
    accentStrong: '#F7BC63',
    accentText: '#221503',
    accentSoft: '#33270F',
    /** blu Nastro Azzurro Peroni: accento secondario per elementi "brand" */
    peroniBlue: '#6B9BF2',
    danger: '#E9705F',
    dangerSoft: '#3A1F19',
    positive: '#6BBF7E',
    positiveSoft: '#1C3322',
    chatIncoming: '#292217',
    chatOutgoing: '#243626',
    skeletonBase: '#292217',
    skeletonHighlight: '#3A3122',
    star: '#F0B84A',
    starMuted: '#57503F',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: '#000000',
    tint: '#F0A63C',
    icon: '#A89B89',
    tabIconDefault: '#7E7361',
    tabIconSelected: '#F0A63C',
  },
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

/** Raggi generosi: l'app deve sembrare morbida, mai spigolosa. */
export const Radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Ombre morbide e calde per elevare le superfici. In dark l'elevazione arriva
 * più dal colore della superficie che dall'ombra (che resta sottile).
 */
export function shadows(scheme: 'light' | 'dark') {
  const color = Colors[scheme].shadow;
  const soft = scheme === 'light' ? 0.1 : 0.4;
  const strong = scheme === 'light' ? 0.16 : 0.55;
  return {
    /** card in lista */
    card: {
      shadowColor: color,
      shadowOpacity: soft,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    /** elementi hero, modali, tab bar */
    raised: {
      shadowColor: color,
      shadowOpacity: strong,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    /** pulsanti primari e FAB */
    fab: {
      shadowColor: scheme === 'light' ? Colors.light.accentStrong : '#000',
      shadowOpacity: scheme === 'light' ? 0.35 : 0.5,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  } as const;
}

/**
 * Molle standard per le micro-interazioni (reanimated). Un solo linguaggio di
 * movimento in tutta l'app: reattivo sul press, morbido sugli ingressi.
 */
export const Springs = {
  /** feedback immediato al tocco */
  press: { damping: 18, stiffness: 320, mass: 0.7 },
  /** ingressi di card e sezioni */
  gentle: { damping: 20, stiffness: 180, mass: 0.9 },
  /** elementi che "rimbalzano" con personalità (badge, indicatori) */
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#60646C',
    background: '#fff',
    surface: '#fff',
    border: '#E6E6EA',
    accent: '#C77D0E',
    accentText: '#ffffff',
    accentSoft: '#FBF1E0',
    danger: '#C0392B',
    positive: '#2E7D32',
    chatIncoming: '#F1F3F5',
    chatOutgoing: '#DDF4E7',
    skeletonBase: '#ECEFF3',
    skeletonHighlight: '#F7F8FA',
    star: '#F5A623',
    starMuted: '#D5D7DC',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#B0B4BA',
    background: '#151718',
    surface: '#1E2022',
    border: '#2A2B2E',
    accent: '#E0A33D',
    accentText: '#000000',
    accentSoft: '#2A2316',
    danger: '#E06B5E',
    positive: '#5BB36A',
    chatIncoming: '#262A2E',
    chatOutgoing: '#21392D',
    skeletonBase: '#25282C',
    skeletonHighlight: '#30343A',
    star: '#F0B84A',
    starMuted: '#555B63',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
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

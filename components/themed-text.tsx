import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'display'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'caption'
    | 'label'
    | 'link';
};

/**
 * Scala tipografica del brand: `display` e `title` in Bebas Neue (sempre
 * maiuscolo, molto grande), il resto in Inter. `label` per le etichette
 * di sezione, `link` per i rimandi in giallo.
 */
export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const c = useColors();

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'display' ? styles.display : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'caption' ? [styles.caption, { color: c.textSecondary }] : undefined,
        type === 'label' ? [styles.label, { color: c.textSecondary }] : undefined,
        type === 'link' ? [styles.link, { color: c.accent }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 23,
  },
  defaultSemiBold: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    lineHeight: 23,
  },
  display: {
    fontFamily: Fonts.display,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: Fonts.sansBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: Fonts.sansSemiBold,
    lineHeight: 23,
    fontSize: 16,
  },
});

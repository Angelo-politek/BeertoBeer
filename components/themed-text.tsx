import { StyleSheet, Text, type TextProps } from 'react-native';

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
 * Scala tipografica dell'app. `display` per i numeri/hero, `title` per i
 * titoli di schermata, `label` per le etichette maiuscolette di sezione.
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
    fontSize: 16,
    lineHeight: 23,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  display: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  link: {
    lineHeight: 23,
    fontSize: 16,
    fontWeight: '600',
  },
});

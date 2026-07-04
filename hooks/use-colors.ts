import { Colors, shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Restituisce l'intera palette di colori per il tema corrente (chiaro/scuro).
 * Comodo nei componenti che usano più colori insieme.
 */
export function useColors() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

/** Ombre del tema corrente (card / raised / fab). */
export function useShadows() {
  const scheme = useColorScheme() ?? 'light';
  return shadows(scheme);
}

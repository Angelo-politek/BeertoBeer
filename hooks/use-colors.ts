import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Restituisce l'intera palette di colori per il tema corrente (chiaro/scuro).
 * Comodo nei componenti che usano più colori insieme.
 */
export function useColors() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

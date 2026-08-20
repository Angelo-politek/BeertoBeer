import { Redirect } from 'expo-router';

/** Compatibilità con vecchi deep link: BeerCoin ora vive nel Profilo. */
export default function LegacyWalletRedirect() {
  return <Redirect href="/(tabs)/profile" />;
}

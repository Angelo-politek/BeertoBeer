/**
 * Ponte leggero tra la schermata di onboarding e il guard nel root layout.
 * Quando l'utente completa l'onboarding, la schermata chiama markOnboardingDone()
 * così il guard aggiorna il suo stato locale senza dover rileggere dal DB (che
 * altrimenti lo rispedirebbe all'onboarding al primo cambio di rotta).
 */

let done = false;
const listeners = new Set<(v: boolean) => void>();

/** Segna l'onboarding come completato in memoria e notifica il guard. */
export function markOnboardingDone() {
  done = true;
  listeners.forEach((l) => l(true));
}

/** Reset al logout: il prossimo utente deve poter rivedere l'onboarding. */
export function resetOnboardingSignal() {
  done = false;
}

export function getOnboardingSignal(): boolean {
  return done;
}

export function subscribeOnboardingSignal(fn: (v: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

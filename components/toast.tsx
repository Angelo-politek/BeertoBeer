import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Radii } from '@/constants/theme';
import { useColors, useShadows } from '@/hooks/use-colors';

type ToastType = 'success' | 'error';

type ToastState = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  /** Mostra un toast non bloccante che scompare da solo (default: successo). */
  show: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Feedback leggero per le azioni andate a buon fine (o piccoli errori):
 * a differenza di Alert non interrompe il flusso e sparisce da solo.
 * Gli errori che richiedono una decisione restano su Alert.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, type });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastBanner key={toast.id} message={toast.message} type={toast.type} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast va usato dentro <ToastProvider>');
  return ctx;
}

function ToastBanner({ message, type }: { message: string; type: ToastType }) {
  const c = useColors();
  const sh = useShadows();
  const insets = useSafeAreaInsets();
  const success = type === 'success';

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 84 }]}>
      <Animated.View
        entering={SlideInDown.springify().damping(16).stiffness(220)}
        exiting={FadeOutDown.duration(180)}
        style={[styles.pill, { backgroundColor: c.text }, sh.raised]}>
        <View style={[styles.iconCircle, { backgroundColor: success ? c.positive : c.danger }]}>
          <Text style={styles.icon}>{success ? '✓' : '✕'}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.message, { color: c.background }]}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
    paddingLeft: 8,
    paddingRight: 18,
    paddingVertical: 8,
    borderRadius: Radii.pill,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  message: {
    flexShrink: 1,
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
  },
});

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View, type ViewToken } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandIcon } from '@/components/ui/brand-icon';
import { ONBOARDING_SLIDES, PHILOSOPHY_TAGLINE, type OnboardingSlide } from '@/constants/branding';
import { Radii, Spacing, Springs } from '@/constants/theme';
import { completeOnboarding } from '@/data/api';
import { useColors } from '@/hooks/use-colors';
import { CITIES, nearestCity } from '@/lib/cities';
import { useCity } from '@/lib/city-context';
import { getCurrentCoords } from '@/lib/location';
import { markOnboardingDone } from '@/lib/onboarding-signal';

const { width } = Dimensions.get('window');

type Page = { kind: 'slide'; slide: OnboardingSlide } | { kind: 'setup' };

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Page>);

/**
 * Onboarding: prima vende la FILOSOFIA (scambio tra pari + community), poi
 * l'ultimo step raccoglie città + conferme (18+ / regole). Le slide hanno un
 * parallax guidato dallo scroll: emoji e testi entrano a velocità diverse.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { city, setCityKey } = useCity();
  const listRef = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(0);
  const [over18, setOver18] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const scrollX = useSharedValue(0);

  async function detectCity() {
    const coords = await getCurrentCoords().catch(() => null);
    if (coords) setCityKey(nearestCity(coords).key);
  }

  // Gli slide della filosofia + un ultimo step "setup" (città/gate).
  const pages: Page[] = [
    ...ONBOARDING_SLIDES.map((s) => ({ kind: 'slide' as const, slide: s })),
    { kind: 'setup' as const },
  ];
  const isLast = index === pages.length - 1;
  const canContinue = over18 && acceptedRules;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  function goNext() {
    if (isLast) return;
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  async function finish() {
    setFinishing(true);
    // Segnala subito al guard che l'onboarding è concluso (evita che rispedisca
    // l'utente qui prima che il flag lato server sia rileggibile).
    markOnboardingDone();
    try {
      await completeOnboarding();
    } catch {
      // best-effort: anche se la scrittura fallisce, entra comunque nell'app.
    } finally {
      router.replace('/(tabs)');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <AnimatedFlatList
          ref={listRef as never}
          data={pages}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          renderItem={({ item, index: i }) =>
            item.kind === 'slide' ? (
              <SlideView slide={item.slide} pageIndex={i} scrollX={scrollX} />
            ) : (
              <SetupView
                over18={over18}
                acceptedRules={acceptedRules}
                onToggle18={() => setOver18((v) => !v)}
                onToggleRules={() => setAcceptedRules((v) => !v)}
                cityKey={city.key}
                onPickCity={setCityKey}
                onUseLocation={detectCity}
              />
            )
          }
        />

        {/* Indicatori di pagina */}
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <Dot key={i} active={i === index} />
          ))}
        </View>

        <View style={styles.footer}>
          {isLast ? (
            <Button
              label="Entra nella community"
              onPress={finish}
              disabled={!canContinue}
              loading={finishing}
            />
          ) : (
            <Button label="Avanti" onPress={goNext} />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Dot({ active }: { active: boolean }) {
  const c = useColors();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, Springs.gentle);
  }, [active, progress]);

  const style = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [8, 26]),
    opacity: interpolate(progress.value, [0, 1], [0.6, 1]),
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: active ? c.accent : c.border }, style]} />;
}

function SlideView({
  slide,
  pageIndex,
  scrollX,
}: {
  slide: OnboardingSlide;
  pageIndex: number;
  scrollX: SharedValue<number>;
}) {
  const c = useColors();

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.slideContent}>
        <View style={[styles.emojiCircle, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <BrandIcon name={slide.icon} size={64} color={c.accent} />
        </View>
        <View style={styles.slideTextBlock}>
          <ThemedText type="title" style={styles.slideTitle}>
            {slide.titolo}
          </ThemedText>
          <ThemedText style={[styles.slideText, { color: c.textSecondary }]}>{slide.testo}</ThemedText>
        </View>
      </View>
    </View>
  );
}

function SetupView({
  over18,
  acceptedRules,
  onToggle18,
  onToggleRules,
  cityKey,
  onPickCity,
  onUseLocation,
}: {
  over18: boolean;
  acceptedRules: boolean;
  onToggle18: () => void;
  onToggleRules: () => void;
  cityKey: string;
  onPickCity: (key: string) => void;
  onUseLocation: () => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.setupContent}>
        <ThemedText type="title" style={styles.slideTitle}>
          CI SIAMO QUASI
        </ThemedText>
        <ThemedText style={[styles.slideText, { color: c.textSecondary }]}>{PHILOSOPHY_TAGLINE}</ThemedText>

        <View style={styles.citySection}>
          <ThemedText type="label">La tua città</ThemedText>
          <View style={styles.cityChips}>
            {CITIES.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                active={item.key === cityKey}
                onPress={() => onPickCity(item.key)}
              />
            ))}
          </View>
          <Button label="Trova la mia città" size="md" variant="secondary" onPress={onUseLocation} />
        </View>

        <View style={styles.checklist}>
          <ToggleRow
            checked={over18}
            onPress={onToggle18}
            title="Dichiaro di avere almeno 18 anni"
            subtitle="Beer to Beer è riservato a utenti maggiorenni."
          />
          <ToggleRow
            checked={acceptedRules}
            onPress={onToggleRules}
            title="Accetto le regole della community"
            subtitle="Uso responsabile, niente vendita di alcol e rispetto della moderazione."
          />
        </View>
      </View>
    </View>
  );
}

function ToggleRow({
  checked,
  onPress,
  title,
  subtitle,
}: {
  checked: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
}) {
  const c = useColors();
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, Springs.bouncy);
  }, [checked, progress]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.98}
      style={[
        styles.toggleRow,
        { backgroundColor: checked ? c.accentSoft : c.surfaceAlt },
      ]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? c.accent : c.textSecondary,
            backgroundColor: checked ? c.accent : 'transparent',
          },
        ]}>
        <Animated.View style={[styles.checkboxDot, { backgroundColor: c.accentText }, dotStyle]} />
      </View>
      <View style={styles.toggleText}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText type="caption">{subtitle}</ThemedText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  page: { flex: 1, justifyContent: 'center' },
  slideContent: { alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl },
  emojiCircle: {
    width: 150,
    height: 150,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  slideEmoji: { fontSize: 76, lineHeight: 96 },
  slideTextBlock: { alignItems: 'center', gap: Spacing.md },
  slideTitle: { textAlign: 'center' },
  slideText: { textAlign: 'center', lineHeight: 24, fontSize: 16 },
  setupContent: { gap: Spacing.lg, padding: Spacing.lg, justifyContent: 'center', flex: 1 },
  citySection: { gap: Spacing.sm },
  cityChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  checklist: { gap: Spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDot: { width: 11, height: 11, borderRadius: 5.5 },
  toggleText: { flex: 1, gap: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  dot: { height: 8, borderRadius: 4 },
  footer: { padding: Spacing.md, paddingBottom: Spacing.lg },
});

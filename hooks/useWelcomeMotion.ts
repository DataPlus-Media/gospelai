import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Platform } from 'react-native';

export function useWelcomeMotion(featureCount: number) {
  const isFocused = useIsFocused();
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  // Stay still until the system preference is known, and if reading it fails.
  const [reduceMotion, setReduceMotion] = useState(true);
  const entranceRef = useRef<Animated.Value[] | null>(null);
  if (entranceRef.current === null || entranceRef.current.length !== featureCount) {
    entranceRef.current = Array.from({ length: featureCount }, () => new Animated.Value(0));
  }
  const entrance = entranceRef.current;
  const heroEntrance = useRef(new Animated.Value(0)).current;
  const scriptureEntrance = useRef(new Animated.Value(0)).current;
  const emeraldDrift = useRef(new Animated.Value(0)).current;
  const goldDrift = useRef(new Animated.Value(0)).current;
  const hasEntered = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      const updatePreference = () => setReduceMotion(preference.matches);
      updatePreference();
      const supportsModernListener = typeof preference.addEventListener === 'function';
      if (supportsModernListener) preference.addEventListener('change', updatePreference);
      else preference.addListener(updatePreference);
      return () => {
        if (supportsModernListener) preference.removeEventListener('change', updatePreference);
        else preference.removeListener(updatePreference);
      };
    }

    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        if (mounted) setReduceMotion(true);
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const allEntranceValues = [heroEntrance, scriptureEntrance, ...entrance];
    const canAnimate = !reduceMotion && isFocused && appIsActive;

    if (!canAnimate) {
      allEntranceValues.forEach((value) => {
        value.stopAnimation();
        value.setValue(0);
      });
      emeraldDrift.stopAnimation();
      goldDrift.stopAnimation();
      emeraldDrift.setValue(0);
      goldDrift.setValue(0);
      return;
    }

    const useNativeDriver = Platform.OS !== 'web';
    const animations: Animated.CompositeAnimation[] = [];
    if (!hasEntered.current) {
      hasEntered.current = true;
      heroEntrance.setValue(12);
      scriptureEntrance.setValue(14);
      entrance.forEach((value) => value.setValue(12));
      animations.push(
        Animated.stagger(105, [
          Animated.spring(heroEntrance, {
            toValue: 0,
            damping: 19,
            stiffness: 115,
            useNativeDriver,
          }),
          Animated.spring(scriptureEntrance, {
            toValue: 0,
            damping: 19,
            stiffness: 115,
            useNativeDriver,
          }),
          ...entrance.map((value) =>
            Animated.spring(value, {
              toValue: 0,
              damping: 19,
              stiffness: 115,
              useNativeDriver,
            }),
          ),
        ]),
      );
    }

    const emeraldLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(emeraldDrift, {
          toValue: 1,
          duration: 6800,
          isInteraction: false,
          useNativeDriver,
        }),
        Animated.timing(emeraldDrift, {
          toValue: 0,
          duration: 6800,
          isInteraction: false,
          useNativeDriver,
        }),
      ]),
    );
    const goldLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(goldDrift, {
          toValue: 1,
          duration: 8200,
          isInteraction: false,
          useNativeDriver,
        }),
        Animated.timing(goldDrift, {
          toValue: 0,
          duration: 8200,
          isInteraction: false,
          useNativeDriver,
        }),
      ]),
    );
    animations.push(emeraldLoop, goldLoop);
    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
      allEntranceValues.forEach((value) => value.stopAnimation());
      emeraldDrift.stopAnimation();
      goldDrift.stopAnimation();
    };
  }, [
    appIsActive,
    emeraldDrift,
    entrance,
    goldDrift,
    heroEntrance,
    isFocused,
    reduceMotion,
    scriptureEntrance,
  ]);

  const emeraldStyle = useMemo(
    () => ({
      transform: [
        {
          translateX: emeraldDrift.interpolate({
            inputRange: [0, 1],
            outputRange: [-18, 18],
          }),
        },
        {
          translateY: emeraldDrift.interpolate({
            inputRange: [0, 1],
            outputRange: [12, -16],
          }),
        },
      ],
    }),
    [emeraldDrift],
  );
  const goldStyle = useMemo(
    () => ({
      opacity: goldDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [0.46, 0.7],
      }),
      transform: [
        {
          translateX: goldDrift.interpolate({
            inputRange: [0, 1],
            outputRange: [-18, 18],
          }),
        },
        {
          translateY: goldDrift.interpolate({
            inputRange: [0, 1],
            outputRange: [12, -16],
          }),
        },
      ],
    }),
    [goldDrift],
  );

  return {
    entrance,
    emeraldStyle,
    goldStyle,
    heroEntrance,
    scriptureEntrance,
  };
}

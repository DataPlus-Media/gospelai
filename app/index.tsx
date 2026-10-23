import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { welcomeStyles as styles } from '@/components/welcome/styles';
import { useWelcomeMotion } from '@/hooks/useWelcomeMotion';
import Colors from '@/constants/Colors';

const FEATURES = [
  {
    icon: 'chatbubble-ellipses-outline' as const,
    iconColor: Colors.coral,
    title: 'Ask and explore',
    desc: 'Ask questions and explore Scripture in chat.',
  },
  {
    icon: 'book-outline' as const,
    iconColor: Colors.scripture,
    title: 'Read Scripture',
    desc: 'Browse and search the KJV Bible.',
  },
  {
    icon: 'sunny-outline' as const,
    iconColor: Colors.coral,
    title: 'A daily passage',
    desc: 'Start the day with a passage.',
  },
  {
    icon: 'journal-outline' as const,
    iconColor: Colors.coralSoft,
    title: 'Keep personal notes',
    desc: 'Write down reflections and prayers.',
  },
];

const WELCOME_ROUTE = '/(auth)/(drawer)/today' as const;

export default function Index() {
  const { bottom, left, right, top } = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { entrance, emeraldStyle, goldStyle, heroEntrance, scriptureEntrance } =
    useWelcomeMotion(FEATURES.length);

  function startProviderSignIn(provider: 'apple' | 'google') {
    router.push({ pathname: '/login', params: { type: 'login', provider } });
  }

  const wide = width >= 600 && fontScale < 1.5;
  const stackActions = width < 360 || fontScale >= 1.5;
  const contentWidth = Math.min(width - left - right, 680);

  return (
    <View style={styles.root}>
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        <Animated.View
          testID="welcome-light-emerald"
          style={[styles.lightOrb, styles.emeraldOrb, emeraldStyle]}
        >
          <View pointerEvents="none" style={[styles.glowLayer, styles.emeraldGlowOuter]} />
          <View pointerEvents="none" style={[styles.glowLayer, styles.emeraldGlowMiddle]} />
          <View pointerEvents="none" style={[styles.glowLayer, styles.emeraldGlowCore]} />
        </Animated.View>
        <Animated.View
          testID="welcome-light-gold"
          style={[styles.lightOrb, styles.goldOrb, goldStyle]}
        >
          <View pointerEvents="none" style={[styles.glowLayer, styles.goldGlowOuter]} />
          <View pointerEvents="none" style={[styles.glowLayer, styles.goldGlowMiddle]} />
          <View pointerEvents="none" style={[styles.glowLayer, styles.goldGlowCore]} />
        </Animated.View>
        <View style={styles.horizonGlow} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: top + (wide ? 34 : 22),
            paddingBottom: Math.max(bottom, 20) + 24,
            paddingLeft: Math.max(left, 20),
            paddingRight: Math.max(right, 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={[styles.column, { maxWidth: contentWidth }]}>
          <Animated.View
            testID="welcome-entrance"
            style={[
              styles.hero,
              { transform: [{ translateY: heroEntrance }] },
              wide && styles.wideHero,
            ]}
          >
            <Image
              source={require('@/assets/images/logo-white.png')}
              style={styles.logo}
              accessible
              accessibilityLabel="GospelAI"
            />
            <Text style={styles.eyebrow}>A QUIET PLACE TO READ AND REFLECT ON GOD&apos;s WORD</Text>
            <Text style={styles.headline}>Come as you are.{'\n'}Begin with Scripture.</Text>
          </Animated.View>

          <Animated.View
            testID="welcome-entrance"
            style={[
              styles.scriptureCard,
              { transform: [{ translateY: scriptureEntrance }] },
            ]}
          >
            <View style={styles.scriptureTopline}>
              <View style={styles.scriptureRule} />
              <Text style={styles.scriptureLabel}>FROM 2 CORINTHIANS</Text>
              <View style={styles.scriptureRule} />
            </View>
            <Text style={styles.scripture}>
              “Therefore if any man be in Christ, he is a new creature: the old things are passed away; and all things are become new.”
            </Text>
            <Text style={styles.citation}>2 CORINTHIANS 5:17</Text>
            <View pointerEvents="none" style={styles.cardCorner} />
          </Animated.View>

          <View style={styles.featuresHeading}>
            <Text style={styles.sectionLabel}>GET STARTED</Text>
            <Text style={styles.sectionNote}>Explore at your own pace.</Text>
          </View>
          <View style={[styles.features, wide && styles.featuresWide]}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                testID="welcome-entrance"
                style={[
                  styles.featureCard,
                  wide && styles.featureCardWide,
                  { transform: [{ translateY: entrance[index] }] },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${feature.iconColor}17` }]}>
                  <Ionicons name={feature.icon} size={20} color={feature.iconColor} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.desc}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isSignedIn ? 'Return to Today' : 'Start exploring. Continue without an account.'
              }
              onPress={() => router.replace(WELCOME_ROUTE)}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>
                {isSignedIn ? 'Return to Today' : 'Start exploring'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.onCoral} />
            </Pressable>
            {!isSignedIn && (
              <>
                <Text style={styles.guestNote}>
                  Continue without an account. You can explore today’s study as a guest.
                </Text>

                <View style={[styles.accountActions, stackActions && styles.stackedActions]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign in"
                    onPress={() => router.push({ pathname: '/login', params: { type: 'login' } })}
                    style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.signInText}>Sign in</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create account"
                    onPress={() => router.push({ pathname: '/login', params: { type: 'register' } })}
                    style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.createText}>Create account</Text>
                  </Pressable>
                </View>

                <View style={styles.oauthRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple"
                    onPress={() => startProviderSignIn('apple')}
                    style={({ pressed }) => [styles.oauthButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.oauthText}>Apple</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                    onPress={() => startProviderSignIn('google')}
                    style={({ pressed }) => [styles.oauthButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.oauthText}>Google</Text>
                  </Pressable>
                </View>
              </>
            )}
            <Text style={styles.footerNote}>Read, reflect, and ask questions at your own pace.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

import { useOAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const FEATURES = [
  {
    icon: 'chatbubble-ellipses' as const,
    iconColor: '#20AB6E',
    title: 'AI-Powered Chat',
    desc: 'Ask anything about scripture and faith',
  },
  {
    icon: 'book' as const,
    iconColor: '#c8a951',
    title: 'Full KJV Bible',
    desc: 'Read, search and explore all 31,000+ verses',
  },
  {
    icon: 'sunny' as const,
    iconColor: '#c8a951',
    title: 'Verse of the Day',
    desc: 'Start each day with a curated scripture',
  },
  {
    icon: 'journal' as const,
    iconColor: '#3b82f6',
    title: 'Notes & Prayers',
    desc: 'Save what moves you, write your prayers',
  },
];

export default function Index() {
  const { bottom, top } = useSafeAreaInsets();
  const router = useRouter();

  const google = useOAuth({ strategy: 'oauth_google' });
  const apple = useOAuth({ strategy: 'oauth_apple' });

  const redirectUrl = makeRedirectUri({
    scheme: 'gospelai',
    path: 'oauth-native-callback',
  });

  async function doOAuth(start: typeof google.startOAuthFlow) {
    try {
      const { createdSessionId, setActive, signIn, signUp } = await start({ redirectUrl });
      const sid = createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;
      if (sid) {
        await setActive?.({ session: sid });
        router.replace('/(auth)/(drawer)/(chat)/new');
        return;
      }
      Alert.alert('Authentication', 'Additional steps are required to complete sign in.');
    } catch (e: any) {
      const msg =
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        e?.message ||
        'Sign in failed';
      Alert.alert('Authentication', msg);
    }
  }

  const ACTION_AREA_HEIGHT = 260 + bottom;

  return (
    <View style={[styles.root, { backgroundColor: '#0b0b10' }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: top + 24, paddingBottom: ACTION_AREA_HEIGHT + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/logo-white.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>GospelAI</Text>
          <Text style={styles.subtitle}>Where Scripture meets AI</Text>
        </View>

        <View style={styles.cards}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: f.iconColor + '1a' }]}>
                <Ionicons name={f.icon} size={22} color={f.iconColor} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.quote}>
          "Thy word is a lamp unto my feet, and a light unto my path"{'\n'}
          — Psalm 119:105
        </Text>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: bottom + 16 }]}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.replace('/(auth)/(drawer)/(chat)/new')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.btnPrimaryText}>Continue without account</Text>
        </TouchableOpacity>

        <View style={styles.btnRow}>
          <Link href={{ pathname: '/login', params: { type: 'login' } }} asChild>
            <TouchableOpacity style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
          <Link href={{ pathname: '/login', params: { type: 'register' } }} asChild>
            <TouchableOpacity style={styles.btnGreen}>
              <Text style={styles.btnGreenText}>Create Account</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.oauthRow}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.oauthBtn}
              onPress={() => doOAuth(apple.startOAuthFlow)}
            >
              <Ionicons name="logo-apple" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.oauthText}>Apple</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.oauthBtn}
            onPress={() => doOAuth(google.startOAuthFlow)}
          >
            <Ionicons name="logo-google" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.oauthText}>Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  hero: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 14 },
  appName: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  subtitle: { fontSize: 15, color: '#9ca3af', marginTop: 6 },

  cards: { gap: 12, marginBottom: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111217',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232633',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#f3f4f6', marginBottom: 2 },
  cardDesc: { fontSize: 13, color: '#9ca3af' },

  quote: {
    textAlign: 'center',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#c8a951',
    lineHeight: 20,
    marginHorizontal: 8,
  },

  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d0e14',
    borderTopWidth: 1,
    borderTopColor: '#1b1e29',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  btnPrimary: {
    flexDirection: 'row',
    backgroundColor: '#111217',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#232633',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  btnRow: { flexDirection: 'row', gap: 10 },
  btnOutline: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3a3f52',
  },
  btnOutlineText: { color: '#f3f4f6', fontSize: 15, fontWeight: '600' },
  btnGreen: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#20AB6E',
  },
  btnGreenText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  oauthRow: { flexDirection: 'row', gap: 10 },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1a1d27',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2e40',
  },
  oauthText: { color: '#f3f4f6', fontSize: 14, fontWeight: '600' },
});

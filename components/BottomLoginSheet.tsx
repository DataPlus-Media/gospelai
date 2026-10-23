// components/BottomLoginSheet.tsx
import Colors from '@/constants/Colors';
import { defaultStyles } from '@/constants/Styles';
import { useOAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const BottomLoginSheet = () => {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();

  const google = useOAuth({ strategy: 'oauth_google' });
  const apple = useOAuth({ strategy: 'oauth_apple' });

  // ✅ IMPORTANT: this must match your app scheme in app.json
  const redirectUrl = makeRedirectUri({
    scheme: 'gospelai',
    path: 'oauth-native-callback',
  });

  async function doOAuth(start: typeof google.startOAuthFlow) {
    try {
      const { createdSessionId, setActive, signIn, signUp } = await start({
        redirectUrl,
      });

      const sid =
        createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;

      if (sid) {
        await setActive?.({ session: sid });
        router.replace('/(auth)/(drawer)/(chat)/new');
        return;
      }

      Alert.alert('Sign in', 'A few more steps are needed to finish signing in.');
    } catch (e: any) {
      // ✅ log the real Clerk error so we can see the exact cause
      console.log('OAUTH ERROR', JSON.stringify(e, null, 2));

      const msg =
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        e?.message ||
        'We couldn’t sign you in. Please try again.';
      Alert.alert('Sign in', msg);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottom }]}>
      <TouchableOpacity
        style={[defaultStyles.btn, styles.btnLight]}
        onPress={() => doOAuth(apple.startOAuthFlow)}
      >
        <Ionicons name="logo-apple" size={14} style={styles.btnIcon} />
        <Text style={styles.btnLightText}>Continue with Apple</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[defaultStyles.btn, styles.btnDark]}
        onPress={() => doOAuth(google.startOAuthFlow)}
      >
        <Ionicons name="logo-google" size={16} style={styles.btnIcon} color="#fff" />
        <Text style={styles.btnDarkText}>Continue with Google</Text>
      </TouchableOpacity>

      <Link
        href={{ pathname: '/login', params: { type: 'register' } }}
        style={[defaultStyles.btn, styles.btnDark]}
        asChild
      >
        <TouchableOpacity>
          <Ionicons name="mail" size={20} style={styles.btnIcon} color="#fff" />
          <Text style={styles.btnDarkText}>Sign up with email</Text>
        </TouchableOpacity>
      </Link>

      <Link
        href={{ pathname: '/login', params: { type: 'login' } }}
        style={[defaultStyles.btn, styles.btnOutline]}
        asChild
      >
        <TouchableOpacity>
          <Text style={styles.btnDarkText}>Sign in</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 26,
    gap: 14,
  },
  btnLight: { backgroundColor: Colors.text },
  btnLightText: { color: Colors.background, fontSize: 20 },
  btnDark: { backgroundColor: Colors.plum },
  btnDarkText: { color: Colors.text, fontSize: 20 },
  btnOutline: { borderWidth: 1, borderColor: '#514849' },
  btnIcon: { paddingRight: 6 },
});

export default BottomLoginSheet;
// login.tsx

import { defaultStyles } from '@/constants/Styles';
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'auth' | 'reset';

const Page = () => {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded, setActive: signupSetActive } = useSignUp();
  const google = useOAuth({ strategy: 'oauth_google' });
  const apple = useOAuth({ strategy: 'oauth_apple' });

  const [mode, setMode] = useState<Mode>('auth');

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // reset-password specific
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const redirectUrl = makeRedirectUri({
    scheme: 'gospelai',
    path: 'oauth-native-callback',
  });

  const doOAuth = async (start: typeof google.startOAuthFlow) => {
    setLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive, signIn: oauthSignIn, signUp: oauthSignUp } =
        await start({ redirectUrl });
      const sessionId =
        createdSessionId || oauthSignIn?.createdSessionId || oauthSignUp?.createdSessionId;

      if (sessionId) {
        await setOAuthActive?.({ session: sessionId });
        router.replace('/(auth)/(drawer)/today');
        return;
      }

      Alert.alert('Authentication', 'Additional steps are required to complete sign in.');
    } catch (err: any) {
      Alert.alert(
        'Authentication',
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Sign in failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  // refs so we can jump between fields
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const resetCodeRef = useRef<TextInput | null>(null);
  const newPasswordRef = useRef<TextInput | null>(null);

  const onSignUpPress = async () => {
    if (!signUpLoaded) return;
    setLoading(true);

    try {
      const result = await signUp.create({
        emailAddress,
        password,
      });
      signupSetActive({ session: result.createdSessionId });
    } catch (err: any) {
      Alert.alert('Sign up failed', err?.errors?.[0]?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });
      await setActive({ session: completeSignIn.createdSessionId });
    } catch (err: any) {
      Alert.alert('Login failed', err?.errors?.[0]?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRequestResetCode = async () => {
    if (!isLoaded) return;
    if (!emailAddress.trim()) {
      Alert.alert('Email required', 'Please enter your email address first.');
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress.trim(),
      });
      Alert.alert(
        'Check your email',
        'We’ve sent a 6-digit reset code to your email address.'
      );
    } catch (err: any) {
      Alert.alert(
        'Reset failed',
        err?.errors?.[0]?.message ||
          'Unable to start password reset. Check that email sign-in is enabled in Clerk.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onCompleteReset = async () => {
    if (!isLoaded) return;
    if (!resetCode.trim() || !newPassword.trim()) {
      Alert.alert('Missing info', 'Enter the code and your new password.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: newPassword,
      });

      await setActive({ session: result.createdSessionId });
    } catch (err: any) {
      Alert.alert(
        'Reset failed',
        err?.errors?.[0]?.message || 'The code may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isLogin = type === 'login';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={110}
      style={styles.container}
    >
      {loading && (
        <View style={defaultStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={require('../assets/images/logo-dark.png')} style={styles.logo} />

        <Text style={styles.title}>
          {mode === 'reset'
            ? 'Reset your password'
            : isLogin
            ? 'Welcome back'
            : 'Create your account'}
        </Text>

        {mode === 'auth' ? (
          <>
            <View style={{ marginBottom: 30 }}>
              <TextInput
                ref={emailRef}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="john@apple.com"
                placeholderTextColor="#8b94a9"
                value={emailAddress}
                onChangeText={setEmailAddress}
                style={styles.inputField}
              />
              <TextInput
                ref={passwordRef}
                placeholder="password"
                placeholderTextColor="#8b94a9"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.inputField}
                returnKeyType={isLogin ? 'done' : 'go'}
              />

              {isLogin && (
                <TouchableOpacity
                  style={styles.forgotWrap}
                  onPress={() => setMode('reset')}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLogin ? (
              <TouchableOpacity
                style={[defaultStyles.btn, styles.btnPrimary]}
                onPress={onSignInPress}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Login"
              >
                <Text style={styles.btnPrimaryText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[defaultStyles.btn, styles.btnPrimary]}
                onPress={onSignUpPress}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Create account"
              >
                <Text style={styles.btnPrimaryText}>Create account</Text>
              </TouchableOpacity>
            )}

            <View style={styles.oauthDivider}>
              <View style={styles.oauthRule} />
              <Text style={styles.oauthDividerText}>OR CONTINUE WITH</Text>
              <View style={styles.oauthRule} />
            </View>

            <View style={styles.oauthRow}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.oauthButton}
                  onPress={() => doOAuth(apple.startOAuthFlow)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                >
                  <Ionicons name="logo-apple" size={18} color="#eef2f8" />
                  <Text style={styles.oauthButtonText}>Apple</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.oauthButton}
                onPress={() => doOAuth(google.startOAuthFlow)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Ionicons name="logo-google" size={16} color="#eef2f8" />
                <Text style={styles.oauthButtonText}>Google</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // ===== RESET PASSWORD MODE =====
          <>
            <View style={{ marginBottom: 30 }}>
              <TextInput
                ref={emailRef}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="send"
                placeholder="john@apple.com"
                placeholderTextColor="#8b94a9"
                value={emailAddress}
                onChangeText={setEmailAddress}
                style={styles.inputField}
                onSubmitEditing={onRequestResetCode}
              />
              <TouchableOpacity
                style={[defaultStyles.btn, styles.secondaryBtn]}
                onPress={onRequestResetCode}
              >
                <Text style={styles.secondaryText}>Send reset code</Text>
              </TouchableOpacity>

              <TextInput
                ref={resetCodeRef}
                placeholder="6-digit code"
                placeholderTextColor="#8b94a9"
                value={resetCode}
                onChangeText={setResetCode}
                keyboardType="number-pad"
                style={styles.inputField}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />
              <TextInput
                ref={newPasswordRef}
                placeholder="New password"
                placeholderTextColor="#8b94a9"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={styles.inputField}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={[defaultStyles.btn, styles.btnPrimary]}
              onPress={onCompleteReset}
            >
              <Text style={styles.btnPrimaryText}>Update password & sign in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => setMode('auth')}
            >
              <Text style={styles.backText}>← Back to login</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d12', // FaithChat --bg
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginVertical: 80,
  },
  title: {
    fontSize: 30,
    marginBottom: 20,
    fontWeight: 'bold',
    alignSelf: 'center',
    color: '#eef2f8', // --ink
  },
  inputField: {
    marginVertical: 6,
    height: 50,
    borderWidth: 1,
    borderColor: '#222a3e', // --border
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#101521', // dark input bg
    color: '#eef2f8', // --ink
  },
  forgotWrap: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  forgotText: {
    color: '#2e7bef', // --accent
    fontWeight: '600',
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#2e7bef', // --accent
    borderRadius: 999,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 40,
    elevation: 10,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  oauthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 10,
  },
  oauthRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#222a3e',
  },
  oauthDividerText: {
    color: '#8b94a9',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  oauthRow: {
    flexDirection: 'row',
    gap: 10,
  },
  oauthButton: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#222a3e',
    borderRadius: 14,
    backgroundColor: '#101521',
  },
  oauthButtonText: {
    color: '#eef2f8',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#101521',
    borderRadius: 999,
    marginTop: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#222a3e',
  },
  secondaryText: {
    color: '#eef2f8',
    fontSize: 14,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  backText: {
    color: '#8b94a9',
    fontSize: 14,
  },
});

export default Page;
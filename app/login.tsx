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

      Alert.alert('Sign in', 'A few more steps are needed to finish signing in.');
    } catch (err: any) {
      Alert.alert(
        'Sign in',
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'We couldn’t sign you in. Please try again.'
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
      Alert.alert('Couldn’t create account', err?.errors?.[0]?.message || 'Please try again.');
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
      Alert.alert('Couldn’t sign in', err?.errors?.[0]?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRequestResetCode = async () => {
    if (!isLoaded) return;
    if (!emailAddress.trim()) {
      Alert.alert('Email needed', 'Enter your email address first.');
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
        'Password reset unavailable',
        err?.errors?.[0]?.message ||
          'We couldn’t start the password reset. Please try again, or contact support if it keeps happening.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onCompleteReset = async () => {
    if (!isLoaded) return;
    if (!resetCode.trim() || !newPassword.trim()) {
      Alert.alert('A few details are missing', 'Enter the code and your new password.');
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
        'Couldn’t reset password',
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
          <ActivityIndicator size="large" color="#D8C176" />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.brand}>
            <Image source={require('../assets/images/logo-white.png')} style={styles.logo} />
            <Text style={styles.eyebrow}>GOSPELAI · SCRIPTURE & STUDY</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.title}>
              {mode === 'reset'
                ? 'Reset your password'
                : isLogin
                ? 'Welcome back'
                : 'Create your account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'reset'
                ? 'Enter your email to reset your password.'
                : isLogin
                ? 'Sign in to continue your study.'
                : 'Create an account to get started with GospelAI.'}
            </Text>

        {mode === 'auth' ? (
          <>
            <View style={styles.fieldGroup}>
              <TextInput
                ref={emailRef}
                accessibilityLabel="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="Email address"
                placeholderTextColor="#A6B4A9"
                value={emailAddress}
                onChangeText={setEmailAddress}
                style={styles.inputField}
              />
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Password"
                placeholder="Password"
                placeholderTextColor="#A6B4A9"
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
                accessibilityLabel="Sign in"
              >
                <Text style={styles.btnPrimaryText}>Sign in</Text>
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
              <TouchableOpacity
                style={styles.oauthButton}
                onPress={() => doOAuth(apple.startOAuthFlow)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <Ionicons name="logo-apple" size={19} color="#F4F1E8" />
                <Text style={styles.oauthButtonText}>Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.oauthButton}
                onPress={() => doOAuth(google.startOAuthFlow)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Ionicons name="logo-google" size={18} color="#D8C176" />
                <Text style={styles.oauthButtonText}>Google</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // ===== RESET PASSWORD MODE =====
          <>
            <View style={styles.fieldGroup}>
              <TextInput
                ref={emailRef}
                accessibilityLabel="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="send"
                placeholder="Email address"
                placeholderTextColor="#A6B4A9"
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
                accessibilityLabel="Six-digit reset code"
                placeholder="6-digit code"
                placeholderTextColor="#A6B4A9"
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
                accessibilityLabel="New password"
                placeholder="New password"
                placeholderTextColor="#A6B4A9"
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
              <Text style={styles.backText}>← Back to sign in</Text>
            </TouchableOpacity>
          </>
        )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101C17',
    paddingHorizontal: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 13,
  },
  eyebrow: {
    color: '#D3B86D',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  authCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(213, 226, 213, 0.13)',
    backgroundColor: 'rgba(243, 245, 235, 0.055)',
  },
  title: {
    color: '#F4F1E8',
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -0.7,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#B4C0B6',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  inputField: {
    marginTop: 8,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(220, 230, 219, 0.18)',
    borderRadius: 14,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(8, 18, 13, 0.38)',
    color: '#F4F1E8',
    fontSize: 15,
  },
  forgotWrap: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  forgotText: {
    color: '#DCC77F',
    fontWeight: '700',
    fontSize: 14,
  },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: '#D8C176',
    borderRadius: 15,
    marginVertical: 3,
  },
  btnPrimaryText: {
    color: '#173A2C',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  oauthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 19,
    marginBottom: 14,
  },
  oauthRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(220, 201, 130, 0.35)',
  },
  oauthDividerText: {
    color: '#D3B86D',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  oauthRow: {
    flexDirection: 'row',
    gap: 9,
  },
  oauthButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: 'rgba(220, 230, 219, 0.15)',
    borderRadius: 13,
    backgroundColor: 'rgba(8, 18, 13, 0.2)',
  },
  oauthButtonText: {
    color: '#E1E6DD',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    minHeight: 50,
    backgroundColor: 'rgba(8, 18, 13, 0.2)',
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 230, 219, 0.15)',
  },
  secondaryText: {
    color: '#E1E6DD',
    fontSize: 14,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 17,
    alignItems: 'center',
  },
  backText: {
    color: '#A6B4A9',
    fontSize: 14,
  },
});

export default Page;
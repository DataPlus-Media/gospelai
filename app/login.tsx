// login.tsx

import { defaultStyles } from '@/constants/Styles';
import Colors from '@/constants/Colors';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
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
import {
  activateSessionIfPresent,
  clerkErrorMessage,
  getSignInFactorPlan,
  getSignUpNextStep,
  hasSessionId,
  type SignInFactorPlan,
} from '@/utils/clerkAuth';
import { runClerkOAuthFlow } from '@/utils/clerkOAuth';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'auth' | 'reset';
type SignInResource = NonNullable<ReturnType<typeof useSignIn>['signIn']>;
type SignUpResource = NonNullable<ReturnType<typeof useSignUp>['signUp']>;
type PendingChallenge =
  | {
      kind: 'signIn';
      resource: SignInResource;
      plan: SignInFactorPlan;
    }
  | { kind: 'signUpEmail'; resource: SignUpResource }
  | { kind: 'newPassword'; resource: SignInResource }
  | { kind: 'signUpFields'; resource: SignUpResource; fields: string[] };

const Page = () => {
  const { type, provider } = useLocalSearchParams<{ type?: string; provider?: string }>();
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded, setActive: signupSetActive } = useSignUp();

  const [mode, setMode] = useState<Mode>('auth');

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const startedProvider = useRef<string | null>(null);

  // reset-password specific
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const redirectUrl = makeRedirectUri({
    scheme: 'gospelsai',
    path: 'oauth-native-callback',
  });

  const activateAndContinue = async (
    sessionId: unknown,
    activate?: (params: { session: string }) => Promise<unknown>
  ) => {
    if (!hasSessionId(sessionId)) return false;
    const activateSession = activate ?? (isLoaded ? setActive : undefined);
    if (!activateSession) {
      throw new Error('Clerk returned a session, but it cannot be activated on this screen.');
    }
    const activated = await activateSessionIfPresent(sessionId, (session) =>
      activateSession({ session })
    );
    if (activated) router.replace('/(auth)/(drawer)/today');
    return activated;
  };

  const continueSignIn = async (resource: SignInResource) => {
    if (resource.status === 'needs_new_password') {
      setNewPassword('');
      setPendingChallenge({ kind: 'newPassword', resource });
      return;
    }
    const plan = getSignInFactorPlan(resource);
    if (!plan) {
      Alert.alert(
        'Sign-in needs another step',
        `This sign-in cannot continue on this screen. Try another sign-in option or share these details with support: status=${resource.status ?? 'unknown'}; methods=${[
          ...(resource.supportedFirstFactors ?? []),
          ...(resource.supportedSecondFactors ?? []),
        ].map((factor) => factor.strategy).join(', ') || 'none'}.`
      );
      return;
    }

    let prepared = resource;
    if (plan.stage === 'first') {
      if (plan.strategy === 'email_code' && plan.emailAddressId) {
        prepared = await resource.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: plan.emailAddressId,
        });
      } else if (plan.strategy === 'phone_code' && plan.phoneNumberId) {
        prepared = await resource.prepareFirstFactor({
          strategy: 'phone_code',
          phoneNumberId: plan.phoneNumberId,
        });
      }
    } else if (plan.strategy === 'email_code' || plan.strategy === 'phone_code') {
      prepared = await resource.prepareSecondFactor({
        strategy: plan.strategy,
        ...(plan.emailAddressId ? { emailAddressId: plan.emailAddressId } : {}),
        ...(plan.phoneNumberId ? { phoneNumberId: plan.phoneNumberId } : {}),
      });
    }

    setVerificationCode('');
    setPendingChallenge({ kind: 'signIn', resource: prepared, plan });
    if (plan.strategy === 'email_code' || plan.strategy === 'phone_code') {
      Alert.alert('Verification code sent', 'Enter the code to finish signing in.');
    }
  };

  const continueSignUp = async (resource: SignUpResource) => {
    const nextStep = getSignUpNextStep(resource);
    if (nextStep?.kind === 'fields') {
      const supportedFields = ['first_name', 'last_name', 'password'];
      const supportedMissing = nextStep.fields.filter((field) =>
        supportedFields.includes(field)
      );
      if (supportedMissing.length) {
        setPendingChallenge({
          kind: 'signUpFields',
          resource,
          fields: supportedMissing,
        });
        return;
      }
      Alert.alert(
        'More account details needed',
        'Clerk requires additional account information that this screen cannot collect. Contact support or try another sign-in option.'
      );
      return;
    }

    if (nextStep?.kind === 'email_code') {
      const prepared = await resource.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
      setVerificationCode('');
      setPendingChallenge({ kind: 'signUpEmail', resource: prepared });
      Alert.alert(
        'Check your email',
        'Enter the verification code to finish creating your account.'
      );
      return;
    }

    Alert.alert(
      'Sign-up needs another step',
      'Clerk did not finish creating the account. Return to sign in and try again, or contact support if this continues.'
    );
  };

  const finishSignIn = async (
    resource: SignInResource,
    activate?: (params: { session: string }) => Promise<unknown>
  ) => {
    if (await activateAndContinue(resource.createdSessionId, activate ?? setActive)) {
      setPendingChallenge(null);
      return;
    }
    await continueSignIn(resource);
  };

  const finishSignUp = async (resource: SignUpResource) => {
    if (await activateAndContinue(resource.createdSessionId, signupSetActive)) {
      setPendingChallenge(null);
      return;
    }
    await continueSignUp(resource);
  };

  const doOAuth = async (strategy: 'oauth_apple' | 'oauth_google') => {
    if (!isLoaded || !signUpLoaded || loading) return;
    setLoading(true);
    setPendingChallenge(null);
    try {
      const result = await runClerkOAuthFlow({
        strategy,
        redirectUrl,
        signIn,
        signUp,
        openAuthSession: WebBrowser.openAuthSessionAsync,
      });
      if (result.kind === 'signIn') {
        await finishSignIn(result.resource);
      } else if (result.kind === 'signUp') {
        await finishSignUp(result.resource);
      }
    } catch (err: any) {
      Alert.alert(
        'Couldn’t sign in',
        clerkErrorMessage(
          err,
          'Clerk could not complete authentication. Check your connection and try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const doOAuthRef = useRef(doOAuth);
  doOAuthRef.current = doOAuth;

  useEffect(() => {
    if (provider !== 'apple' && provider !== 'google') return;
    if (!isLoaded || !signUpLoaded) return;
    if (startedProvider.current === provider) return;
    startedProvider.current = provider;
    void doOAuthRef.current(
      provider === 'apple' ? 'oauth_apple' : 'oauth_google'
    );
  }, [isLoaded, signUpLoaded, provider]);

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
      await finishSignUp(result);
    } catch (err: any) {
      Alert.alert(
        'Couldn’t create account',
        clerkErrorMessage(err, 'Clerk could not create the account. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      const completeSignIn = await signIn.create({
        strategy: 'password',
        identifier: emailAddress.trim(),
        password,
      });
      await finishSignIn(completeSignIn);
    } catch (err: any) {
      Alert.alert(
        'Couldn’t sign in',
        clerkErrorMessage(err, 'Clerk could not complete sign in. Please try again.')
      );
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

      const activated = await activateAndContinue(result.createdSessionId, (params) =>
        setActive(params)
      );
      if (!activated) {
        Alert.alert(
          'Password reset finished',
          'Clerk did not return an active session. Return to sign in and use your new password.'
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Couldn’t reset password',
        err?.errors?.[0]?.message || 'The code may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmitVerification = async () => {
    if (!pendingChallenge) return;
    if (pendingChallenge.kind === 'newPassword') {
      if (!newPassword.trim()) {
        Alert.alert('Password needed', 'Enter a new password to continue.');
        return;
      }
      setLoading(true);
      try {
        const result = await pendingChallenge.resource.resetPassword({ password: newPassword });
        await finishSignIn(result);
      } catch (err) {
        Alert.alert('Couldn’t update password', clerkErrorMessage(err, 'Please try again.'));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!verificationCode.trim()) {
      Alert.alert('Code needed', 'Enter the verification code to continue.');
      return;
    }

    setLoading(true);
    try {
      if (pendingChallenge.kind === 'signIn') {
        const { resource, plan } = pendingChallenge;
        const result =
          plan.stage === 'first'
            ? await resource.attemptFirstFactor({
                strategy: plan.strategy as 'email_code' | 'phone_code',
                code: verificationCode.trim(),
              })
            : await resource.attemptSecondFactor({
                strategy: plan.strategy,
                code: verificationCode.trim(),
              });
        await finishSignIn(result);
      } else if (pendingChallenge.kind === 'signUpEmail') {
        const result = await pendingChallenge.resource.attemptEmailAddressVerification({
          code: verificationCode.trim(),
        });
        await finishSignUp(result);
      }
    } catch (err: any) {
      Alert.alert(
        'Couldn’t verify sign-in',
        clerkErrorMessage(
          err,
          'That code could not be verified. Check it and try again, or request another code.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSignupDetails = async () => {
    if (pendingChallenge?.kind !== 'signUpFields') return;
    const { resource, fields } = pendingChallenge;
    const update: { firstName?: string; lastName?: string; password?: string } = {};
    if (fields.includes('first_name')) update.firstName = signupFirstName.trim();
    if (fields.includes('last_name')) update.lastName = signupLastName.trim();
    if (fields.includes('password')) update.password = signupPassword;

    if (
      (fields.includes('first_name') && !update.firstName) ||
      (fields.includes('last_name') && !update.lastName) ||
      (fields.includes('password') && !update.password)
    ) {
      Alert.alert('Details needed', 'Complete the requested account details to continue.');
      return;
    }

    setLoading(true);
    try {
      const result = await resource.update(update);
      await finishSignUp(result);
    } catch (err: any) {
      Alert.alert(
        'Couldn’t finish creating your account',
        clerkErrorMessage(err, 'Check the details and try again.')
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
          <ActivityIndicator size="large" color={Colors.coral} />
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
              {pendingChallenge && (
                <View style={styles.challenge}>
                  <Text style={styles.challengeTitle}>
                    {pendingChallenge.kind === 'signUpFields'
                      ? 'Complete your account'
                      : pendingChallenge.kind === 'newPassword'
                      ? 'Choose a new password'
                      : 'Verify your sign-in'}
                  </Text>
                  <Text style={styles.challengeHint}>
                    {pendingChallenge.kind === 'signUpFields'
                      ? 'Clerk needs a few more details before your account can be created.'
                      : pendingChallenge.kind === 'signUpEmail'
                      ? 'Enter the email verification code sent to you.'
                      : pendingChallenge.kind === 'newPassword'
                      ? 'Your account requires a new password before you can sign in.'
                      : pendingChallenge.plan.strategy === 'totp'
                      ? 'Enter the code from your authenticator app.'
                      : pendingChallenge.plan.strategy === 'backup_code'
                      ? 'Enter one of your backup codes.'
                      : 'Enter the verification code sent to you.'}
                  </Text>
                  {pendingChallenge.kind === 'signUpFields' ? (
                    <>
                      {pendingChallenge.fields.includes('first_name') && (
                        <TextInput
                          accessibilityLabel="First name"
                          placeholder="First name"
                          placeholderTextColor={Colors.textMuted}
                          value={signupFirstName}
                          onChangeText={setSignupFirstName}
                          style={styles.inputField}
                          autoCapitalize="words"
                        />
                      )}
                      {pendingChallenge.fields.includes('last_name') && (
                        <TextInput
                          accessibilityLabel="Last name"
                          placeholder="Last name"
                          placeholderTextColor={Colors.textMuted}
                          value={signupLastName}
                          onChangeText={setSignupLastName}
                          style={styles.inputField}
                          autoCapitalize="words"
                        />
                      )}
                      {pendingChallenge.fields.includes('password') && (
                        <TextInput
                          accessibilityLabel="Account password"
                          placeholder="Password"
                          placeholderTextColor={Colors.textMuted}
                          value={signupPassword}
                          onChangeText={setSignupPassword}
                          secureTextEntry
                          style={styles.inputField}
                        />
                      )}
                    </>
                  ) : pendingChallenge.kind === 'newPassword' ? (
                    <TextInput
                      accessibilityLabel="New password"
                      placeholder="New password"
                      placeholderTextColor={Colors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      style={styles.inputField}
                    />
                  ) : (
                    <TextInput
                      accessibilityLabel="Verification code"
                      placeholder="Verification code"
                      placeholderTextColor={Colors.textMuted}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType={
                        pendingChallenge.kind === 'signIn' &&
                        pendingChallenge.plan.strategy === 'backup_code'
                          ? 'default'
                          : 'number-pad'
                      }
                      autoCapitalize="none"
                      style={styles.inputField}
                    />
                  )}
                  <TouchableOpacity
                    style={[defaultStyles.btn, styles.secondaryBtn]}
                    onPress={
                      pendingChallenge.kind === 'signUpFields'
                        ? onSubmitSignupDetails
                        : onSubmitVerification
                    }
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={
                      pendingChallenge.kind === 'signUpFields'
                        ? 'Continue account creation'
                        : pendingChallenge.kind === 'newPassword'
                        ? 'Update password and continue'
                        : 'Verify and continue'
                    }
                  >
                    <Text style={styles.secondaryText}>
                      {pendingChallenge.kind === 'signUpFields'
                        ? 'Continue'
                        : pendingChallenge.kind === 'newPassword'
                        ? 'Update password and continue'
                        : 'Verify and continue'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => {
                      setPendingChallenge(null);
                      setVerificationCode('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel verification"
                  >
                    <Text style={styles.backText}>Use another sign-in option</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TextInput
                ref={emailRef}
                accessibilityLabel="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="Email address"
                placeholderTextColor={Colors.textMuted}
                value={emailAddress}
                onChangeText={setEmailAddress}
                style={styles.inputField}
              />
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Password"
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
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
                onPress={() => doOAuth('oauth_apple')}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <Ionicons name="logo-apple" size={19} color="#F4F1E8" />
                <Text style={styles.oauthButtonText}>Apple</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.oauthButton}
                onPress={() => doOAuth('oauth_google')}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Ionicons name="logo-google" size={18} color={Colors.coral} />
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
                placeholderTextColor={Colors.textMuted}
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
                placeholderTextColor={Colors.textMuted}
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
                placeholderTextColor={Colors.textMuted}
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
    backgroundColor: Colors.background,
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
    color: Colors.coral,
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
    borderColor: 'rgba(244, 240, 235, 0.12)',
    backgroundColor: Colors.surface,
  },
  title: {
    color: Colors.text,
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -0.7,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
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
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    backgroundColor: Colors.surfaceRaised,
    color: Colors.text,
    fontSize: 15,
  },
  forgotWrap: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  forgotText: {
    color: Colors.coral,
    fontWeight: '700',
    fontSize: 14,
  },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: Colors.coral,
    borderRadius: 15,
    marginVertical: 3,
  },
  btnPrimaryText: {
    color: Colors.onCoral,
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
    backgroundColor: 'rgba(143, 215, 229, 0.32)',
  },
  oauthDividerText: {
    color: Colors.coral,
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
    borderColor: Colors.border,
    borderRadius: 13,
    backgroundColor: Colors.surfaceRaised,
  },
  oauthButtonText: {
    color: '#E1E6DD',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    minHeight: 50,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#514241',
  },
  secondaryText: {
    color: '#E1E6DD',
    fontSize: 14,
    fontWeight: '600',
  },
  challenge: {
    marginBottom: 16,
  },
  challengeTitle: {
    color: '#F4F1E8',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  challengeHint: {
    color: '#B4C0B6',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
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
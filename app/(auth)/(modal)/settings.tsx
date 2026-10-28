

// app/(auth)/(drawer)/settings.tsx
// Full Settings page with:
// ✅ Guest access (no forced login)
// ✅ If guest: show Apple/Google + Email buttons (properly styled)
// ✅ If signed in: show profile + Sign out button + Delete account option
// ✅ Keeps your dark card / rounded style

import UserAvatar from '@/components/UserAvatar';
import Colors from '@/constants/Colors';
import { useAuth, useOAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clerkErrorMessage } from '@/utils/clerkAuth';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

export default function SettingsScreen() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  const google = useOAuth({ strategy: 'oauth_google' });
  const apple = useOAuth({ strategy: 'oauth_apple' });

  const [busy, setBusy] = useState(false);
  const [deleteInputFocused, setDeleteInputFocused] = useState(false);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [nameStatus, setNameStatus] = useState('');
  useEffect(() => {
    setFirstName(user?.firstName ?? '');
  }, [user?.id, user?.firstName]);

  const saveName = async () => {
    if (!user || busy) return;
    const name = firstName.trim();
    if (!name) {
      setNameStatus('Enter your first name.');
      return;
    }
    setBusy(true);
    setNameStatus('');
    try {
      await user.update({ firstName: name });
      setNameStatus('Name saved. Your Today greeting will use this name.');
    } catch (error) {
      setNameStatus(clerkErrorMessage(error, 'Couldn’t save your name. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Delete account UI state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const focusHandlers = (action: string) => ({
    onFocus: () => setFocusedAction(action),
    onBlur: () =>
      setFocusedAction((current) => (current === action ? null : current)),
  });

  const displayName = useMemo(() => {
    if (!user) return '';
    return (
      user.fullName ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      'Account'
    );
  }, [user]);

  const doOAuth = useCallback(
    async (start: typeof google.startOAuthFlow) => {
      try {
        setBusy(true);
        const { createdSessionId, setActive, signIn, signUp } = await start();

        if (createdSessionId) {
          await setActive?.({ session: createdSessionId });
          router.replace('/(auth)/(drawer)/(chat)/new');
          return;
        }

        if (signIn?.createdSessionId) {
          await setActive?.({ session: signIn.createdSessionId });
          router.replace('/(auth)/(drawer)/(chat)/new');
          return;
        }

        if (signUp?.createdSessionId) {
          await setActive?.({ session: signUp.createdSessionId });
          router.replace('/(auth)/(drawer)/(chat)/new');
          return;
        }

        Alert.alert(
          'Sign in',
          'A few more steps are needed to finish signing in.'
        );
      } catch (e: any) {
        const msg = e?.errors?.[0]?.message || e?.message || 'We couldn’t sign you in. Please try again.';
        Alert.alert('Sign in', msg);
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  const onSignOut = useCallback(async () => {
    try {
      setBusy(true);
      await signOut();
      router.replace('/(auth)/(drawer)/(chat)/new'); // stay in app as guest
    } catch (e: any) {
      Alert.alert('Couldn’t sign out', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [signOut, router]);

  const onDeleteAccount = useCallback(async () => {
    if (!user) return;

    const ok = deleteText.trim().toUpperCase() === 'DELETE';
    if (!ok) {
      Alert.alert('Confirm account deletion', 'Type DELETE to permanently delete your account.');
      return;
    }

    try {
      setBusy(true);

      // Permanently delete the Clerk account
      await user.delete();

      // Clear local session
      await signOut();

      Alert.alert('Account deleted', 'Your account has been deleted.');
      router.replace('/(auth)/(drawer)/(chat)/new');
    } catch (e: any) {
      Alert.alert(
        'Couldn’t delete account',
        e?.errors?.[0]?.message || e?.message || 'Please try again.'
      );
    } finally {
      setBusy(false);
      setDeleteOpen(false);
      setDeleteText('');
    }
  }, [user, deleteText, signOut, router]);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' && (
          <View style={styles.webHeader}>
            <Text style={styles.webHeaderTitle}>Settings</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.webCloseButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close-outline" size={24} color={Colors.coral} />
            </Pressable>
          </View>
        )}

        {/* ACCOUNT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>

          <View style={styles.card}>
            {isSignedIn ? (
              <>
                <View style={styles.signedHeader}>
                  <UserAvatar
                    isSignedIn={isSignedIn}
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    fallbackName={displayName}
                    size={42}
                    radius={21}
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.signedTitle}>{displayName}</Text>
                    <Text style={styles.signedSub}>You’re signed in</Text>
                  </View>
                </View>

                <Text style={styles.profileLabel}>First name for your daily greeting</Text>
                <TextInput
                  accessibilityLabel="First name"
                  value={firstName}
                  onChangeText={(value) => { setFirstName(value); setNameStatus(''); }}
                  placeholder="First name"
                  placeholderTextColor={Colors.textMuted}
                  autoComplete="given-name"
                  autoCapitalize="words"
                  editable={!busy}
                  style={styles.profileInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save first name"
                  disabled={busy}
                  onPress={() => void saveName()}
                  style={({ pressed }) => [styles.rowBtn, pressed && styles.pressed, busy && { opacity: 0.6 }]}
                >
                  <Ionicons name="save-outline" size={20} color={Colors.coral} />
                  <Text style={styles.signedSub}>Save name</Text>
                </Pressable>
                {!!nameStatus && <Text accessibilityLiveRegion="polite" style={styles.helperText}>{nameStatus}</Text>}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign out of GospelAI"
                    {...focusHandlers('sign-out')}
                    style={({ pressed }) => [
                      styles.rowBtn,
                      busy && { opacity: 0.6 },
                      pressed && styles.pressed,
                      focusedAction === 'sign-out' && styles.focused,
                    ]}
                    onPress={onSignOut}
                    disabled={busy}
                  >
                    <Ionicons name="log-out-outline" size={20} color={Colors.coral} />
                    <Text style={styles.rowBtnTextDanger}>Sign out</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                  </Pressable>

                {/* Delete account (toggle) */}
                <View style={{ height: 10 }} />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={deleteOpen ? 'Close account deletion options' : 'Open account deletion options'}
                  {...focusHandlers('delete-account')}
                  style={({ pressed }) => [
                    styles.rowBtn,
                    busy && { opacity: 0.6 },
                    pressed && styles.pressed,
                    focusedAction === 'delete-account' && styles.focused,
                  ]}
                  onPress={() => setDeleteOpen((v) => !v)}
                  disabled={busy}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.coral} />
                  <Text style={styles.rowBtnTextDanger}>Delete account</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons
                    name={deleteOpen ? 'chevron-down' : 'chevron-forward'}
                    size={18}
                    color="#6b7280"
                  />
                </Pressable>

                {deleteOpen && (
                  <View style={styles.dangerBox}>
                    <Text style={styles.dangerTitle}>This is permanent</Text>
                    <Text style={styles.dangerText}>
                      Deleting your account removes your profile and any synced data.
                      Type <Text style={{ fontWeight: '900', color: '#fff' }}>DELETE</Text> to
                      confirm.
                    </Text>

                    <View
                      style={[
                        styles.deleteInputWrap,
                        deleteInputFocused && styles.focused,
                      ]}
                    >
                      <TextInput
                        accessibilityLabel="Type DELETE to confirm account deletion"
                        value={deleteText}
                        onChangeText={setDeleteText}
                        onFocus={() => setDeleteInputFocused(true)}
                        onBlur={() => setDeleteInputFocused(false)}
                        autoCapitalize="characters"
                        placeholder="Type DELETE"
                        placeholderTextColor="#8b94a9"
                        style={styles.deleteInput}
                      />
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Permanently delete account"
                      {...focusHandlers('confirm-delete')}
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        (busy || deleteText.trim().toUpperCase() !== 'DELETE') && {
                          opacity: 0.6,
                        },
                        pressed && styles.pressed,
                        focusedAction === 'confirm-delete' && styles.focused,
                      ]}
                      onPress={onDeleteAccount}
                      disabled={busy || deleteText.trim().toUpperCase() !== 'DELETE'}
                    >
                      <Ionicons name="warning-outline" size={18} color="#fff" />
                      <Text style={styles.deleteBtnText}>Permanently delete</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Guest header */}
                <View style={styles.guestHeader}>
                  <View style={styles.guestBadge}>
                    <Text style={styles.guestBadgeText}>GUEST</Text>
                  </View>
                  <Text style={styles.guestTitle}>You’re browsing as a guest</Text>
                </View>

                {/* OAuth buttons */}
                <View style={styles.authWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple"
                    {...focusHandlers('apple-sign-in')}
                    style={({ pressed }) => [
                      styles.authBtn,
                      styles.authBtnLight,
                      busy && { opacity: 0.6 },
                      pressed && styles.pressed,
                      focusedAction === 'apple-sign-in' && styles.focused,
                    ]}
                    onPress={() => doOAuth(apple.startOAuthFlow)}
                    disabled={busy}
                  >
                    <Ionicons
                      name="logo-apple"
                      size={18}
                      color="#000"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.authBtnText, { color: '#000' }]}>
                      Continue with Apple
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                    {...focusHandlers('google-sign-in')}
                    style={({ pressed }) => [
                      styles.authBtn,
                      styles.authBtnDark,
                      busy && { opacity: 0.6 },
                      pressed && styles.pressed,
                      focusedAction === 'google-sign-in' && styles.focused,
                    ]}
                    onPress={() => doOAuth(google.startOAuthFlow)}
                    disabled={busy}
                  >
                    <Ionicons
                      name="logo-google"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.authBtnText, { color: '#fff' }]}>
                      Continue with Google
                    </Text>
                  </Pressable>

                  {/* Email buttons row (FIXED STYLING) */}
                  <View style={styles.authRow}>
                    <Link
                      href={{ pathname: '/login', params: { type: 'register' } }}
                      asChild
                    >
                      <TouchableOpacity
                        {...focusHandlers('email-sign-up')}
                        accessibilityRole="button"
                        accessibilityLabel="Sign up with email"
                        style={StyleSheet.flatten([
                          styles.smallBtn,
                          styles.smallBtnSolid,
                          focusedAction === 'email-sign-up' && styles.focused,
                        ])}
                      >
                        <Ionicons name="mail" size={16} color="#fff" />
                        <Text style={styles.smallBtnText} numberOfLines={2}>
                          Sign up with email
                        </Text>
                      </TouchableOpacity>
                    </Link>

                    <Link
                      href={{ pathname: '/login', params: { type: 'login' } }}
                      asChild
                    >
                      <TouchableOpacity
                        {...focusHandlers('email-login')}
                        accessibilityRole="button"
                        accessibilityLabel="Log in with email"
                        style={StyleSheet.flatten([
                          styles.smallBtn,
                          styles.smallBtnOutline,
                          focusedAction === 'email-login' && styles.focused,
                        ])}
                      >
                        <Ionicons name="log-in-outline" size={16} color="#fff" />
                        <Text style={styles.smallBtnText} numberOfLines={1}>
                          Log in
                        </Text>
                      </TouchableOpacity>
                    </Link>
                  </View>

                  <Text style={styles.helperText}>
                    You can keep using GospelAI as a guest. Create an account if you want
                    to sync across devices.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>

          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Learn why creating an account is useful"
              {...focusHandlers('account-info')}
              style={({ pressed }) => [
                styles.rowBtn,
                pressed && styles.pressed,
                focusedAction === 'account-info' && styles.focused,
              ]}
              onPress={() => {
                Alert.alert(
                  'Why create an account?',
                  'An account lets you sync across devices and back up your history. You can still use GospelAI as a guest.'
                );
              }}
            >
              <Ionicons name="help-circle-outline" size={20} color="#e5e7eb" />
              <Text style={styles.rowBtnText}>Why create an account?</Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerNote}>GospelAI · Made for quiet study</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  webHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  webHeaderTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  webCloseButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  section: { marginTop: 18 },
  sectionTitle: {
    color: Colors.coral,
    fontWeight: '800',
    letterSpacing: 1.7,
    fontSize: 10,
    marginBottom: 10,
    marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Signed-in block
  profileLabel: { color: Colors.textMuted, fontSize: 13, marginBottom: 8 },
  profileInput: {
    color: Colors.text,
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 50,
  },
  signedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 18,
  },
  signedTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  signedSub: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  // Guest header row
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 15,
  },
  guestBadge: {
    backgroundColor: Colors.plum,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  guestBadgeText: {
    color: Colors.coralSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  guestTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },

  // Auth buttons
  authWrap: { gap: 11 },
  authBtn: {
    minHeight: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBtnLight: { backgroundColor: Colors.text },
  authBtnDark: { backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.borderStrong },
  authBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Email row fixes
  authRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 1,
  },
  smallBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  smallBtnSolid: { backgroundColor: Colors.coralDeep },
  smallBtnOutline: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceRaised,
  },
  smallBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  helperText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },

  // Row buttons
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.78 },
  focused: {
    borderColor: Colors.coral,
    borderWidth: 2,
  },
  rowBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rowBtnTextDanger: {
    color: Colors.coral,
    fontSize: 15,
    fontWeight: '800',
  },

  // Delete account panel
  dangerBox: {
    marginTop: 10,
    backgroundColor: Colors.coralTint,
    borderWidth: 1,
    borderColor: '#634247',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  dangerTitle: {
    color: Colors.coral,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  dangerText: {
    color: '#D3B6B2',
    fontSize: 13,
    lineHeight: 18,
  },
  deleteInputWrap: {
    borderWidth: 1,
    borderColor: '#514849',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  deleteInput: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  deleteBtn: {
    height: 46,
    borderRadius: 999,
    backgroundColor: Colors.coralDeep,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },

  footerNote: {
    textAlign: 'center',
    color: '#A9A1A0',
    marginTop: 12,
    fontWeight: '600',
    fontSize: 12,
  },
});
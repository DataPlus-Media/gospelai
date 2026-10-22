

// app/(auth)/(drawer)/settings.tsx
// Full Settings page with:
// ✅ Guest access (no forced login)
// ✅ If guest: show Apple/Google + Email buttons (properly styled)
// ✅ If signed in: show profile + Sign out button + Delete account option
// ✅ Keeps your dark card / rounded style

import Colors from '@/constants/Colors';
import UserAvatar from '@/components/UserAvatar';
import { useAuth, useOAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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

  // Delete account UI state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');

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
          'Authentication',
          'Additional steps are required to complete sign in.'
        );
      } catch (e: any) {
        const msg = e?.errors?.[0]?.message || e?.message || 'Sign in failed';
        Alert.alert('Authentication', msg);
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
      Alert.alert('Sign out', e?.message || 'Unable to sign out.');
    } finally {
      setBusy(false);
    }
  }, [signOut, router]);

  const onDeleteAccount = useCallback(async () => {
    if (!user) return;

    const ok = deleteText.trim().toUpperCase() === 'DELETE';
    if (!ok) {
      Alert.alert('Confirm', 'Type DELETE to confirm account deletion.');
      return;
    }

    try {
      setBusy(true);

      // Permanently delete the Clerk account
      await user.delete();

      // Clear local session
      await signOut();

      Alert.alert('Account deleted', 'Your account has been permanently removed.');
      router.replace('/(auth)/(drawer)/(chat)/new');
    } catch (e: any) {
      Alert.alert(
        'Delete account',
        e?.errors?.[0]?.message || e?.message || 'Unable to delete account.'
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
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

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

                <TouchableOpacity
                  style={[styles.rowBtn, busy && { opacity: 0.6 }]}
                  onPress={onSignOut}
                  disabled={busy}
                >
                  <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
                  <Text style={styles.rowBtnTextDanger}>Sign out</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                </TouchableOpacity>

                {/* Delete account (toggle) */}
                <View style={{ height: 10 }} />

                <TouchableOpacity
                  style={[styles.rowBtn, busy && { opacity: 0.6 }]}
                  onPress={() => setDeleteOpen((v) => !v)}
                  disabled={busy}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                  <Text style={styles.rowBtnTextDanger}>Delete account</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons
                    name={deleteOpen ? 'chevron-down' : 'chevron-forward'}
                    size={18}
                    color="#6b7280"
                  />
                </TouchableOpacity>

                {deleteOpen && (
                  <View style={styles.dangerBox}>
                    <Text style={styles.dangerTitle}>This is permanent</Text>
                    <Text style={styles.dangerText}>
                      Deleting your account removes your profile and any synced data.
                      Type <Text style={{ fontWeight: '900', color: '#fff' }}>DELETE</Text> to
                      confirm.
                    </Text>

                    <View style={styles.deleteInputWrap}>
                      <TextInput
                        value={deleteText}
                        onChangeText={setDeleteText}
                        autoCapitalize="characters"
                        placeholder="Type DELETE"
                        placeholderTextColor="#8b94a9"
                        style={styles.deleteInput}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.deleteBtn,
                        (busy || deleteText.trim().toUpperCase() !== 'DELETE') && {
                          opacity: 0.6,
                        },
                      ]}
                      onPress={onDeleteAccount}
                      disabled={busy || deleteText.trim().toUpperCase() !== 'DELETE'}
                    >
                      <Ionicons name="warning-outline" size={18} color="#fff" />
                      <Text style={styles.deleteBtnText}>Permanently delete</Text>
                    </TouchableOpacity>
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
                  <TouchableOpacity
                    style={[
                      styles.authBtn,
                      styles.authBtnLight,
                      busy && { opacity: 0.6 },
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
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.authBtn,
                      styles.authBtnDark,
                      busy && { opacity: 0.6 },
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
                  </TouchableOpacity>

                  {/* Email buttons row (FIXED STYLING) */}
                  <View style={styles.authRow}>
                    <Link
                      href={{ pathname: '/login', params: { type: 'register' } }}
                      asChild
                    >
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.smallBtnSolid]}
                      >
                        <Ionicons name="mail" size={16} color="#fff" />
                        <Text style={styles.smallBtnText} numberOfLines={1}>
                          Sign up with email
                        </Text>
                      </TouchableOpacity>
                    </Link>

                    <Link
                      href={{ pathname: '/login', params: { type: 'login' } }}
                      asChild
                    >
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.smallBtnOutline]}
                      >
                        <Ionicons name="log-in-outline" size={16} color="#fff" />
                        <Text style={styles.smallBtnText} numberOfLines={1}>
                          Log in
                        </Text>
                      </TouchableOpacity>
                    </Link>
                  </View>

                  <Text style={styles.helperText}>
                    You can keep using GospelAI as a guest — create an account only if
                    you want sync.
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
              style={styles.rowBtn}
              onPress={() => {
                Alert.alert(
                  'Why create an account?',
                  'Creating an account lets you sync across devices and keep your history backed up. You can still use the app fully as a guest.'
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

        <Text style={styles.footerNote}>GospelAI · Built with ❤️</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0b0d12',
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e9edf5',
  },

  section: { marginTop: 14 },
  sectionTitle: {
    color: '#8b94a9',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  // Signed-in block
  signedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  signedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  signedSub: {
    color: '#8b94a9',
    fontSize: 13,
    marginTop: 2,
  },

  // Guest header row
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
  },
  guestBadge: {
    backgroundColor: '#101521',
    borderWidth: 1,
    borderColor: '#2a2a2c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  guestBadgeText: {
    color: '#8b94a9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  guestTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },

  // Auth buttons
  authWrap: { gap: 12 },
  authBtn: {
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBtnLight: { backgroundColor: '#fff' },
  authBtnDark: { backgroundColor: Colors.grey },
  authBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  // Email row fixes
  authRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  smallBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  smallBtnSolid: { backgroundColor: '#2e7bef' },
  smallBtnOutline: {
    borderWidth: 2,
    borderColor: Colors.grey,
    backgroundColor: '#101521',
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  helperText: {
    color: '#8b94a9',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
  },

  // Row buttons
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#0f1117',
    borderWidth: 1,
    borderColor: '#2a2a2c',
  },
  rowBtnText: {
    color: '#e9edf5',
    fontSize: 15,
    fontWeight: '800',
  },
  rowBtnTextDanger: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '900',
  },

  // Delete account panel
  dangerBox: {
    marginTop: 10,
    backgroundColor: '#0f1117',
    borderWidth: 1,
    borderColor: '#3a1f1f',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  dangerTitle: {
    color: '#ff6b6b',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  dangerText: {
    color: '#8b94a9',
    fontSize: 13,
    lineHeight: 18,
  },
  deleteInputWrap: {
    borderWidth: 1,
    borderColor: '#2a2a2c',
    backgroundColor: '#101521',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  deleteInput: {
    color: '#eef2f8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  deleteBtn: {
    height: 46,
    borderRadius: 999,
    backgroundColor: '#ff6b6b',
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
    color: '#6b7280',
    marginTop: 22,
    fontWeight: '700',
  },
});
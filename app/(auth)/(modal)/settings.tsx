import Colors from '@/constants/Colors';
import { defaultStyles } from '@/constants/Styles';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

const API_BASE =
  (Constants.expoConfig?.extra as any)?.API_BASE ||
  process.env.EXPO_PUBLIC_API_BASE ||
  'https://<your-railway-app>.up.railway.app';

const SettingsPage = () => {
  const router = useRouter();
  const { signOut } = useAuth();
  const db = useSQLiteContext();

  const [checking, setChecking] = useState(false);
  const [healthMsg, setHealthMsg] = useState<string>('Not checked yet');

  async function testConnection() {
    setChecking(true);
    setHealthMsg('Checking…');
    try {
      const r = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setHealthMsg(`Connected: ${j?.service ?? 'ok'} v${j?.v ?? ''}`.trim());
    } catch (e: any) {
      setHealthMsg(`Failed: ${e?.message || 'network error'}`);
    } finally {
      setChecking(false);
    }
  }

  async function clearLocalChats() {
    try {
      await db.execAsync('DELETE FROM messages; DELETE FROM chats;');
      Alert.alert('Cleared', 'Local chat history removed.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to clear local data');
    }
  }

  return (
    <View style={styles.container}>
      {/* API card */}
      <View style={styles.card}>
        <Text style={styles.h1}>API Connection</Text>
        <Text style={styles.line}>Base: <Text style={styles.mono}>{API_BASE}</Text></Text>
        <Text style={[styles.line, { marginBottom: 10 }]}>Status: {healthMsg}</Text>

        <TouchableOpacity
          style={[defaultStyles.btn, styles.primaryBtn]}
          onPress={testConnection}
          disabled={checking}
        >
          {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Test Connection</Text>}
        </TouchableOpacity>
      </View>

      {/* Data card */}
      <View style={styles.card}>
        <Text style={styles.h1}>Data</Text>
        <TouchableOpacity
          style={[defaultStyles.btn, styles.ghostBtn]}
          onPress={clearLocalChats}
        >
          <Text style={[styles.btnText, { color: Colors.grey }]}>Clear Chat History</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[defaultStyles.btn, styles.primaryBtn]}
          onPress={() => router.replace('/(auth)/(drawer)/(chat)/new')}
        >
          <Text style={styles.btnText}>Go to Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[defaultStyles.btn, styles.signOutBtn]}
          onPress={() => signOut()}
        >
          <Text style={styles.btnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SettingsPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
    backgroundColor: Colors.selected,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  h1: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  line: {
    fontSize: 14,
    color: Colors.grey,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  actions: {
    marginTop: 'auto',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
  },
  signOutBtn: {
    backgroundColor: Colors.grey,
  },
  ghostBtn: {
    backgroundColor: '#f3f4f6',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
  },
});
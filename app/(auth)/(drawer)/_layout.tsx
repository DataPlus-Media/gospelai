// app/(auth)/(drawer)/_layout.tsx
import Colors from '@/constants/Colors';
import { getChats, renameChat } from '@/utils/Database';
import type { Chat } from '@/utils/Interfaces';

import { useUser } from '@clerk/clerk-expo';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import {
  DrawerContentScrollView,
  DrawerItemList,
  useDrawerStatus,
} from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomDrawerContent(props: any) {
  const { bottom, top } = useSafeAreaInsets();
  const db = useSQLiteContext();
  const router = useRouter();
  const drawerOpen = useDrawerStatus() === 'open';

  const { user } = useUser();
  const displayName =
    (user?.firstName || user?.lastName
      ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
      : user?.username) ||
    user?.primaryEmailAddress?.emailAddress ||
    'Account';

  const avatarUrl = user?.imageUrl || 'https://galaxies.dev/img/meerkat_2.jpg';

  const [history, setHistory] = useState<Chat[]>([]);
  const [q, setQ] = useState('');

  // Local rename modal state
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [renameId, setRenameId] = useState<number | null>(null);

  const loadHistory = async () => {
    const rows = (await getChats(db)) as Chat[];
    setHistory(rows);
  };

  useEffect(() => {
    if (db) loadHistory();
  }, [db]);

  // Refresh when drawer opens
  useEffect(() => {
    if (drawerOpen && db) loadHistory();
  }, [drawerOpen, db]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return history;
    return history.filter((c) => c.title.toLowerCase().includes(term));
  }, [q, history]);

  const openRename = (id: number, current: string) => {
    setRenameId(id);
    setRenameText(current);
    setRenameVisible(true);
  };

  const submitRename = async () => {
    if (!renameId || !renameText.trim()) {
      setRenameVisible(false);
      return;
    }
    await renameChat(db, renameId, renameText.trim());
    setRenameVisible(false);
    setRenameText('');
    setRenameId(null);
    await loadHistory();
  };

  // ⭐ UPDATED DELETE TO REMOVE MESSAGES + CHAT
  const confirmDelete = (id: number) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Delete messages belonging to this chat
          await db.runAsync('DELETE FROM messages WHERE chat_id = ?', id);

          // Delete the chat itself
          await db.runAsync('DELETE FROM chats WHERE id = ?', id);

          await loadHistory();
        },
      },
    ]);
  };

  const onRowLongPress = (chat: Chat) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Rename', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          userInterfaceStyle: 'dark',
        },
        (index) => {
          if (index === 1) openRename(chat.id, chat.title);
          else if (index === 2) confirmDelete(chat.id);
        }
      );
    } else {
      Alert.alert('Chat options', chat.title, [
        { text: 'Rename', onPress: () => openRename(chat.id, chat.title) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(chat.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, marginTop: top, backgroundColor: '#0b0b10' }}>
      {/* Search bar */}
      <View style={{ backgroundColor: '#0b0b10', paddingBottom: 10 }}>
        <View style={styles.searchSection}>
          <Ionicons style={styles.searchIcon} name="search" size={18} color="#8a90a2" />
          <TextInput
            style={styles.input}
            placeholder="Search"
            placeholderTextColor="#8a90a2"
            value={q}
            onChangeText={setQ}
            underlineColorAndroid="transparent"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          backgroundColor: '#0b0b10',
          paddingTop: 0,
        }}
      >
        <DrawerItemList {...props} />

        {filtered.map((chat) => (
          <Pressable
            key={chat.id}
            onPress={() => router.push(`/(auth)/(drawer)/(chat)/${chat.id}`)}
            onLongPress={() => onRowLongPress(chat)}
            accessibilityRole="button"
          >
            <View style={styles.chatRow}>
              <Ionicons name="chatbubble-outline" size={18} color="#b8bcc7" />
              <Text style={styles.chatTitle} numberOfLines={1}>
                {chat.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </DrawerContentScrollView>

      {/* Footer */}
      <View
        style={{
          padding: 16,
          paddingBottom: bottom + 10,
          backgroundColor: '#111217',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#1b1e29',
        }}
      >
        <Link href="/(auth)/(modal)/settings" asChild>
          <TouchableOpacity style={styles.footer}>
            <Image source={ require('@/assets/images/logo-dark.png')} style={styles.avatar} />
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <Ionicons name="settings-outline" size={20} color="#8a90a2" />
          </TouchableOpacity>
        </Link>
      </View>

      {/* Rename modal */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Chat</Text>
            <TextInput
              autoFocus
              value={renameText}
              onChangeText={setRenameText}
              placeholder="New name"
              placeholderTextColor="#8a90a2"
              style={styles.modalInput}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                onPress={() => setRenameVisible(false)}
                style={[styles.modalBtn, { backgroundColor: '#14151b' }]}
              >
                <Text style={{ fontWeight: '600', color: '#f3f4f6' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRename}
                style={[styles.modalBtn, { backgroundColor: '#3b82f6' }]}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function Layout() {
  const dimensions = useWindowDimensions();
  const router = useRouter();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={{ marginLeft: 16 }}
          >
            <FontAwesome6 name="grip-lines" size={20} color="#f3f4f6" />
          </TouchableOpacity>
        ),
        headerStyle: { backgroundColor: Colors.header_bg },
        headerTintColor: Colors.header_txt,
        headerShadowVisible: false,
        drawerActiveBackgroundColor: '#191b22',
        drawerInactiveBackgroundColor: 'transparent',
        drawerActiveTintColor: '#f3f4f6',
        drawerInactiveTintColor: '#b8bcc7',
        overlayColor: 'rgba(0,0,0,0.7)',
        drawerItemStyle: { borderRadius: 10, marginHorizontal: 8, marginVertical: 2 },
        drawerLabelStyle: { marginLeft: -10, fontWeight: '600' },
        drawerStyle: {
          width: dimensions.width * 0.86,
          backgroundColor: '#0b0b10',
          borderRightWidth: 1,
          borderRightColor: '#1b1e29',
        },
      })}
    >
      <Drawer.Screen
        name="(chat)/new"
        getId={() => Math.random().toString()}
        options={{
          title: 'GospelAI',
          drawerIcon: () => (
            <View style={[styles.item, { backgroundColor: '#000000' }]}>
              <Image
                source={require('@/assets/images/logo-white.png')}
                style={styles.btnImage}
              />
            </View>
          ),
          headerRight: () => null,
        }}
      />

      <Drawer.Screen
        name="(chat)/[id]"
        options={{
          drawerItemStyle: { display: 'none' },
          headerRight: () => (
            <Link href={'/(auth)/(drawer)/(chat)/new'} push asChild>
              <TouchableOpacity>
                <Ionicons
                  name="create-outline"
                  size={24}
                  color="#f3f4f6"
                  style={{ marginRight: 16 }}
                />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />

      <Drawer.Screen
        name="bible"
        options={{
          title: 'Bible',
          drawerIcon: () => (
            <View style={[styles.item]}>
              <Image
                source={require('@/assets/images/bible.png')}
                style={styles.bibleImage}
              />
            </View>
          ),
        }}
        listeners={{
          drawerItemPress: (e) => {
            e.preventDefault();
            router.navigate('/(auth)/bible');
          },
        }}
      />

      <Drawer.Screen
        name="support"
        options={{
          title: 'Support Us',
          drawerIcon: () => (
            <View
              style={[
                styles.item,
                {
                  backgroundColor: '#14151b',
                  width: 28,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#232637',
                },
              ]}
            >
              <Ionicons name="apps-outline" size={18} color="#f3f4f6" />
            </View>
          ),
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  // search
  searchSection: {
    marginHorizontal: 16,
    borderRadius: 10,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14151b',
    borderWidth: 1,
    borderColor: '#232633',
  },
  searchIcon: { padding: 6 },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 8,
    color: '#f3f4f6',
    fontSize: 14,
  },

  // chat history
  chatRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: '#111217',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chatTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#f3f4f6',
  },

  // footer
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10 },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#f3f4f6',
  },

  item: { borderRadius: 15, overflow: 'hidden' },
  btnImage: { margin: 6, width: 30, height: 30 },
  bibleImage: { width: 30, height: 30, resizeMode: 'cover' },

  // rename modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#111217',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232637',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#f3f4f6',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#232637',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    backgroundColor: '#14151b',
    color: '#f3f4f6',
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
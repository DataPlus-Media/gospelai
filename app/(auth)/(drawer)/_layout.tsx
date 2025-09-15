// app/(auth)/(drawer)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  Alert,
  useWindowDimensions,
  Image,
} from 'react-native';
import Colors from '@/constants/Colors';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { getChats, renameChat } from '@/utils/Database';
import type { Chat } from '@/utils/Interfaces';

function CustomDrawerContent(props: any) {
  const { bottom, top } = useSafeAreaInsets();
  const db = useSQLiteContext();
  const router = useRouter();
  const [history, setHistory] = useState<Chat[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const rows = (await getChats(db)) as Chat[];
      setHistory(rows);
    })();
  }, [db]);

  const filtered = q.trim()
    ? history.filter((c) =>
        c.title.toLowerCase().includes(q.trim().toLowerCase())
      )
    : history;

  const promptRename = (id: number, current: string) => {
    Alert.prompt(
      'Rename Chat',
      'Enter a new name',
      async (val) => {
        if (!val) return;
        await renameChat(db, id, val);
        const rows = (await getChats(db)) as Chat[];
        setHistory(rows);
      },
      'plain-text',
      current
    );
  };

  const confirmDelete = (id: number) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM chats WHERE id = ?', id);
          const rows = (await getChats(db)) as Chat[];
          setHistory(rows);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, marginTop: top }}>
      {/* Search */}
      <View style={{ backgroundColor: '#fff', paddingBottom: 10 }}>
        <View style={styles.searchSection}>
          <Ionicons
            style={styles.searchIcon}
            name="search"
            size={18}
            color={Colors.greyLight}
          />
          <TextInput
            style={styles.input}
            placeholder="Search"
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
        contentContainerStyle={{ backgroundColor: '#fff', paddingTop: 0 }}
      >
        {/* Drawer’s own items */}
        <DrawerItemList {...props} />

        {/* History */}
        <View style={{ paddingVertical: 8 }}>
          {filtered.map((chat) => (
            <Pressable
              key={chat.id}
              style={({ pressed }) => [
                styles.chatRow,
                pressed && { backgroundColor: Colors.selected },
              ]}
              onPress={() =>
                router.push(`/(auth)/(drawer)/(chat)/${chat.id}`)
              }
              onLongPress={() =>
                Alert.alert(chat.title, 'Actions', [
                  {
                    text: 'Rename',
                    onPress: () => promptRename(chat.id, chat.title),
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => confirmDelete(chat.id),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            >
              <Text numberOfLines={1} style={styles.chatTitle}>
                {chat.title}
              </Text>
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={Colors.greyLight}
              />
            </Pressable>
          ))}
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View
        style={{
          padding: 16,
          paddingBottom: bottom + 10,
          backgroundColor: Colors.light,
        }}
      >
        <Link href="/(auth)/(modal)/settings" asChild>
          <TouchableOpacity style={styles.footer}>
            <Image
              source={{ uri: 'https://galaxies.dev/img/meerkat_2.jpg' }}
              style={styles.avatar}
            />
            <Text style={styles.userName}>Account & Settings</Text>
            <Ionicons name="settings-outline" size={20} color={Colors.greyLight} />
          </TouchableOpacity>
        </Link>
      </View>
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
            onPress={() =>
              navigation.dispatch(DrawerActions.toggleDrawer())
            }
            style={{ marginLeft: 16 }}
          >
            <FontAwesome6 name="grip-lines" size={20} color={Colors.grey} />
          </TouchableOpacity>
        ),
        headerStyle: { backgroundColor: Colors.light },
        headerShadowVisible: false,
        drawerActiveBackgroundColor: Colors.selected,
        drawerActiveTintColor: '#000',
        drawerInactiveTintColor: '#000',
        overlayColor: 'rgba(0,0,0,0.2)',
        drawerItemStyle: { borderRadius: 12 },
        drawerLabelStyle: { marginLeft: -20 },
        drawerStyle: { width: dimensions.width * 0.86 },
      })}
    >
      <Drawer.Screen
        name="(chat)/new"
        getId={() => Math.random().toString()}
        options={{
          title: 'GospelAI',
          drawerIcon: () => (
            <View style={[styles.item, { backgroundColor: '#000' }]}>
              <Image
                source={require('@/assets/images/logo-white.png')}
                style={styles.btnImage}
              />
            </View>
          ),
          headerRight: () => (
            <Link href={'/(auth)/(drawer)/(chat)/new'} push asChild>
              <TouchableOpacity>
                <Ionicons
                  name="create-outline"
                  size={24}
                  color={Colors.grey}
                  style={{ marginRight: 16 }}
                />
              </TouchableOpacity>
            </Link>
          ),
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
                  color={Colors.grey}
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
            <View style={[styles.item, { backgroundColor: '#000' }]}>
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
        name="Support"
        options={{
          title: 'Support Us',
          drawerIcon: () => (
            <View
              style={[
                styles.item,
                {
                  backgroundColor: '#fff',
                  width: 28,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Ionicons name="apps-outline" size={18} color="#000" />
            </View>
          ),
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    marginHorizontal: 16,
    borderRadius: 10,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
  },
  searchIcon: { padding: 6 },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 8,
    color: '#424242',
  },
  chatRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#000' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10 },
  userName: { fontSize: 16, fontWeight: '600', flex: 1, color: '#000' },
  item: { borderRadius: 15, overflow: 'hidden' },
  btnImage: { margin: 6, width: 16, height: 16 },
  bibleImage: { width: 28, height: 28, resizeMode: 'cover' },
});
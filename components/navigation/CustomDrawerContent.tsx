import { getChats, renameChat } from '@/utils/Database';
import type { Chat } from '@/utils/Interfaces';
import UserAvatar from '@/components/UserAvatar';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { drawerPalette as palette, drawerStyles as styles } from './drawerTheme';

const navGroups = [
  {
    title: 'YOUR RHYTHM',
    routes: [
      { name: 'today', label: 'Today', icon: 'sunny-outline' as const },
      { name: 'bible', label: 'Bible', icon: 'book-outline' as const, artwork: true },
    ],
  },
  {
    title: 'STUDY & REFLECT',
    routes: [
      { name: 'library', label: 'Authors insight', icon: 'library-outline' as const },
      { name: 'saved', label: 'Saved verses', icon: 'bookmark-outline' as const },
      { name: 'notes', label: 'Notes', icon: 'journal-outline' as const },
    ],
  },
];

export default function CustomDrawerContent(props: any) {
  const { bottom, top } = useSafeAreaInsets();
  const db = useSQLiteContext();
  const router = useRouter();
  const drawerOpen = useDrawerStatus() === 'open';
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const displayName =
    (user?.firstName || user?.lastName
      ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
      : user?.username) ||
    user?.primaryEmailAddress?.emailAddress ||
    'Account';

  const [history, setHistory] = useState<Chat[]>([]);
  const [q, setQ] = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [renameId, setRenameId] = useState<number | null>(null);
  const [optionsChat, setOptionsChat] = useState<Chat | null>(null);
  const [deleteChatTarget, setDeleteChatTarget] = useState<Chat | null>(null);
  const currentRoute = props.state.routes[props.state.index];
  const activeRoute = currentRoute?.name;
  const todayRoute = props.state.routes.find((route: any) => route.name === 'today');

  const loadHistory = useCallback(async () => {
    const rows = (await getChats(db)) as Chat[];
    setHistory(rows);
  }, [db]);

  useEffect(() => {
    if (db) loadHistory();
  }, [db, loadHistory]);

  useEffect(() => {
    if (drawerOpen && db) loadHistory();
  }, [drawerOpen, db, loadHistory]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return history;
    return history.filter((chat) => chat.title.toLowerCase().includes(term));
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

  const confirmDelete = (id: number) => {
    if (Platform.OS === 'web') {
      const chat = history.find((item) => item.id === id);
      if (chat) setDeleteChatTarget(chat);
      return;
    }
    Alert.alert('Delete this conversation?', 'This will permanently delete the conversation and all its messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM messages WHERE chat_id = ?', id);
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
    } else if (Platform.OS === 'web') {
      setOptionsChat(chat);
    } else {
      Alert.alert('Conversation options', chat.title, [
        { text: 'Rename', onPress: () => openRename(chat.id, chat.title) },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(chat.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const navigateToRoute = (routeName: string, routeKey: string) => {
    Keyboard.dismiss();
    const event = props.navigation.emit({
      type: 'drawerItemPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) props.navigation.navigate(routeName);
    props.navigation.dispatch(DrawerActions.closeDrawer());
  };

  const goHome = () => {
    if (todayRoute) {
      navigateToRoute('today', todayRoute.key);
      return;
    }

    Keyboard.dismiss();
    router.replace('/(auth)/(drawer)/today');
    props.navigation.dispatch(DrawerActions.closeDrawer());
  };

  const openWelcomePage = () => {
    Keyboard.dismiss();
    router.push('/');
    props.navigation.dispatch(DrawerActions.closeDrawer());
  };

  const openChat = (chat: Chat) => {
    Keyboard.dismiss();
    router.push(`/(auth)/(drawer)/(chat)/${chat.id}`);
    props.navigation.dispatch(DrawerActions.closeDrawer());
  };

  const openNewChat = () => {
    Keyboard.dismiss();
    router.push('/(auth)/(drawer)/(chat)/new');
    props.navigation.dispatch(DrawerActions.closeDrawer());
  };

  return (
    <View style={[styles.drawer, { paddingTop: top }]}>
      <View style={styles.brandHeader}>
        <Pressable
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel="GospelAI home, go to Today"
          accessibilityHint="Returns to the Today screen and closes navigation"
          style={({ pressed }) => [styles.brandLine, pressed && styles.pressed]}
        >
          <View style={styles.logoFrame}>
            <Image source={require('@/assets/images/logo-white.png')} style={styles.brandLogo} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>GospelAI</Text>
            <Text style={styles.brandTagline}>SCRIPTURE · REFLECTION · WISDOM</Text>
          </View>
        </Pressable>
        <View style={styles.brandRule}>
          <View style={styles.ruleLine} />
          <Ionicons name="sparkles" size={11} color={palette.gold} />
          <View style={styles.ruleLine} />
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {navGroups.map((group) => (
          <View key={group.title} style={styles.navGroup}>
            <Text style={styles.groupLabel}>{group.title}</Text>
            {group.routes.map((item) => {
              const route = props.state.routes.find((r: any) => r.name === item.name);
              const descriptor = route ? props.descriptors[route.key] : undefined;
              const selected = activeRoute === item.name;
              if (!route || descriptor?.options?.drawerItemStyle?.display === 'none') return null;
              return (
                <Pressable
                  key={item.name}
                  onPress={() => navigateToRoute(item.name, route.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  {...(Platform.OS === 'web' ? { 'aria-current': selected ? 'page' : undefined } : {})}
                  style={({ pressed }) => [
                    styles.navItem,
                    selected && styles.navItemSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {selected && <View style={styles.selectedRail} />}
                  {'artwork' in item && item.artwork ? (
                    <Image source={require('@/assets/images/bible.png')} style={styles.navArtwork} />
                  ) : (
                    <View style={[styles.iconTile, selected && styles.iconTileSelected]}>
                      <Ionicons
                        name={item.icon}
                        size={19}
                        color={selected ? palette.gold : palette.muted}
                      />
                    </View>
                  )}
                  <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{item.label}</Text>
                  {selected && <Ionicons name="chevron-forward" size={16} color={palette.gold} />}
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={[styles.navGroup, styles.conversationsGroup]}>
          <View style={styles.sectionHeading}>
            <Text style={styles.groupLabel}>CONVERSATIONS</Text>
            <Pressable
              onPress={openNewChat}
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
              accessibilityState={{ selected: activeRoute === '(chat)/new' }}
              {...(Platform.OS === 'web' ? { 'aria-current': activeRoute === '(chat)/new' ? 'page' : undefined } : {})}
              style={({ pressed }) => [styles.addButton, activeRoute === '(chat)/new' && styles.iconTileSelected, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={19} color={palette.gold} />
              <Text style={styles.newChatLabel}>New chat</Text>
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color={palette.quiet} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations"
              placeholderTextColor={palette.quiet}
              value={q}
              onChangeText={setQ}
              underlineColorAndroid="transparent"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search conversation history"
            />
            {q.length > 0 && (
              <Pressable
                onPress={() => setQ('')}
                accessibilityRole="button"
                accessibilityLabel="Clear conversation search"
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={17} color={palette.quiet} />
              </Pressable>
            )}
          </View>
          {filtered.length ? (
            <View style={styles.chatList}>
              {filtered.map((chat) => {
                const selected =
                  activeRoute === '(chat)/[id]' &&
                  String(currentRoute?.params?.id) === String(chat.id);
                return (
                  <Pressable
                    key={chat.id}
                    onPress={() => openChat(chat)}
                    onLongPress={() => onRowLongPress(chat)}
                    accessibilityRole="button"
                    accessibilityLabel={`${chat.title}. Hold for conversation options.`}
                    accessibilityState={{ selected }}
                    {...(Platform.OS === 'web' ? { 'aria-current': selected ? 'page' : undefined } : {})}
                    style={({ pressed }) => [
                      styles.chatRow,
                      selected && styles.chatRowSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={17}
                      color={selected ? palette.gold : palette.quiet}
                    />
                    <Text style={[styles.chatTitle, selected && styles.chatTitleSelected]} numberOfLines={1}>
                      {chat.title}
                    </Text>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        onRowLongPress(chat);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Options for ${chat.title}`}
                      hitSlop={9}
                      style={styles.chatMore}
                    >
                      <Ionicons name="ellipsis-horizontal" size={17} color={palette.quiet} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <Ionicons name={q ? 'search-outline' : 'chatbubble-outline'} size={18} color={palette.quiet} />
              <Text style={styles.emptyText}>
                 {q ? 'No conversations match your search' : 'Your conversations will show up here'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.navGroup}>
          <Text style={styles.groupLabel}>MORE</Text>
          <Pressable
            onPress={openWelcomePage}
            accessibilityRole="button"
            accessibilityLabel="Open welcome page"
            style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
          >
            <View style={styles.iconTile}>
              <Ionicons name="sparkles-outline" size={19} color={palette.muted} />
            </View>
            <Text style={styles.navLabel}>Welcome page</Text>
          </Pressable>
          {(() => {
            const route = props.state.routes.find((r: any) => r.name === 'support');
            if (!route) return null;
            return (
              <Pressable
                onPress={() => navigateToRoute('support', route.key)}
                accessibilityRole="button"
              accessibilityLabel="Support GospelAI"
                accessibilityState={{ selected: activeRoute === 'support' }}
                {...(Platform.OS === 'web' ? { 'aria-current': activeRoute === 'support' ? 'page' : undefined } : {})}
                style={({ pressed }) => [
                  styles.navItem,
                  activeRoute === 'support' && styles.navItemSelected,
                  pressed && styles.pressed,
                ]}
              >
                {activeRoute === 'support' && <View style={styles.selectedRail} />}
                <View style={styles.iconTile}>
                  <Ionicons name="heart-outline" size={19} color={palette.muted} />
                </View>
                <Text style={styles.navLabel}>Support GospelAI</Text>
              </Pressable>
            );
          })()}
        </View>
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottom, 14) }]}>
        {isSignedIn ? (
          <Link href="/(auth)/(modal)/settings" asChild>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${displayName}, account settings`}
              style={styles.accountCard}
            >
              <UserAvatar
                isSignedIn={isSignedIn}
                firstName={user?.firstName}
                lastName={user?.lastName}
                fallbackName={displayName}
                size={38}
                radius={12}
              />
              <View style={styles.accountCopy}>
                <Text style={styles.accountEyebrow}>SIGNED IN</Text>
                <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
              </View>
              <View style={styles.settingsIcon}>
                <Ionicons name="settings-outline" size={19} color={palette.muted} />
              </View>
            </TouchableOpacity>
          </Link>
        ) : (
          <View style={styles.authArea}>
            <View style={styles.authPromptRow}>
              <UserAvatar isSignedIn={false} size={38} radius={12} />
              <Text style={styles.authPrompt}>Save your reflections across devices.</Text>
            </View>
            <View style={styles.authBtnRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                style={styles.signInBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  router.push({ pathname: '/login', params: { type: 'login' } });
                  props.navigation.dispatch(DrawerActions.closeDrawer());
                }}
              >
                <Text style={styles.signInText}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Create account"
                style={styles.createBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  router.push({ pathname: '/login', params: { type: 'register' } });
                  props.navigation.dispatch(DrawerActions.closeDrawer());
                }}
              >
                <Text style={styles.createText}>Create account</Text>
                <Ionicons name="arrow-forward" size={15} color={palette.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>CONVERSATION</Text>
            <Text style={styles.modalTitle}>Rename this conversation</Text>
            <TextInput
              autoFocus
              value={renameText}
              onChangeText={setRenameText}
              placeholder="New name"
              placeholderTextColor={palette.quiet}
              style={styles.modalInput}
              returnKeyType="done"
              onSubmitEditing={submitRename}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setRenameVisible(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRename} style={styles.modalSave}>
                <Text style={styles.modalSaveText}>Save name</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!optionsChat} transparent animationType="fade" onRequestClose={() => setOptionsChat(null)}>
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close conversation options"
            style={StyleSheet.absoluteFill}
            onPress={() => setOptionsChat(null)}
          />
          <View style={styles.actionMenuCard}>
            <Text style={styles.modalEyebrow}>CONVERSATION</Text>
            <Text style={styles.actionMenuTitle} numberOfLines={2}>{optionsChat?.title}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Rename conversation"
              style={styles.menuAction}
              onPress={() => {
                if (optionsChat) openRename(optionsChat.id, optionsChat.title);
                setOptionsChat(null);
              }}
            >
              <Ionicons name="pencil-outline" size={19} color={palette.gold} />
              <Text style={styles.menuActionText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete conversation"
              style={styles.menuAction}
              onPress={() => {
                if (optionsChat) setDeleteChatTarget(optionsChat);
                setOptionsChat(null);
              }}
            >
              <Ionicons name="trash-outline" size={19} color="#d47e7d" />
              <Text style={[styles.menuActionText, { color: '#d47e7d' }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.menuCancel}
              onPress={() => setOptionsChat(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteChatTarget} transparent animationType="fade" onRequestClose={() => setDeleteChatTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>REMOVE CONVERSATION</Text>
            <Text style={styles.modalTitle}>Delete this conversation?</Text>
            <Text style={styles.deleteDescription}>
              “{deleteChatTarget?.title}” and its messages will be permanently removed.
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setDeleteChatTarget(null)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={async () => {
                  if (!deleteChatTarget) return;
                  await db.runAsync('DELETE FROM messages WHERE chat_id = ?', deleteChatTarget.id);
                  await db.runAsync('DELETE FROM chats WHERE id = ?', deleteChatTarget.id);
                  setDeleteChatTarget(null);
                  await loadHistory();
                }}
                style={styles.deleteButton}
              >
                <Text style={styles.modalSaveText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

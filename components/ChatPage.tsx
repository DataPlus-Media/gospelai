// components/ChatPage.tsx
import ChatMessage from '@/components/ChatMessage';
import HeaderDropDown from '@/components/HeaderDropDown';
import MessageIdeas from '@/components/MessageIdeas';
import MessageInput from '@/components/MessageInput';
import VerseOfDay from '@/components/VerseOfDay';

import { defaultStyles } from '@/constants/Styles';
import { addChat, addMessage, getMessages } from '@/utils/Database';
import { Message, Role } from '@/utils/Interfaces';

import { useAuth } from '@clerk/clerk-expo';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import Colors from '@/constants/Colors';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

// ---- call your own backend (no client key) ----
const RAW_API_BASE =
  (Constants.expoConfig?.extra as any)?.API_BASE ||
  process.env.EXPO_PUBLIC_API_BASE ||
  'https://server-production-ef77.up.railway.app';
export const API_BASE = RAW_API_BASE.replace(/\/+$/, ''); // trim trailing slash

const APP_SECRET = 'your-mobile-app-secret';
type ChatTurn = { role: 'user' | 'assistant'; content: string };
type Idea = { title: string; text: string };

const FALLBACK_IDEAS: Idea[] = [
  { title: 'Like a mustard seed', text: "why is this significant" },
  { title: 'Suggest godly activities', text: 'for the weekend with friends' },
  { title: 'Provide three bible verses', text: "to say before a job interview" },
];

async function fetchIdeas(): Promise<Idea[]> {
  const res = await fetch(`${API_BASE}/api/ideas`, {
    headers: { 'x-app-secret': APP_SECRET },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const ideas: Idea[] = (data.ideas ?? []).map((i: any) => ({
    title: String(i.title ?? ''),
    text: String(i.text ?? ''),
  }));
  if (ideas.length === 0) throw new Error('Empty ideas');
  return ideas;
}

async function askServerChat(message: string, history: ChatTurn[]) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-secret': APP_SECRET },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  const data = await res.json();
  return String(data.reply ?? '');
}

const ChatPage = () => {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

  const loadIdeas = useCallback(async () => {
    setIdeasLoading(true);
    try {
      const fetched = await fetchIdeas();
      setIdeas(fetched);
    } catch {
      setIdeas(FALLBACK_IDEAS);
    } finally {
      setIdeasLoading(false);
    }
  }, []);

  // keep a local chatId that is kept in sync with the route param
  const [chatId, _setChatId] = useState<string | undefined>(id);
  const chatIdRef = useRef<string | undefined>(chatId);
  const setChatId = (v: string | undefined) => {
    chatIdRef.current = v;
    _setChatId(v);
  };

  // 🔧 IMPORTANT: sync when the route `id` changes and load messages
  useEffect(() => {
    if (!db) return;

    if (id) {
      setChatId(id);
      getMessages(db, parseInt(id, 10)).then(setMessages);
    } else {
      setChatId(undefined);
      setMessages([]);
      loadIdeas();
    }
  }, [id, db, loadIdeas]);

  const getCompletion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!chatIdRef.current) {
      // first message of a brand new chat
      const res = await addChat(db, trimmed);
      const newId = String(res.lastInsertRowId);
      setChatId(newId);
      await addMessage(db, parseInt(newId, 10), { content: trimmed, role: Role.User });
      setMessages([
        { role: Role.User, content: trimmed },
        { role: Role.Bot, content: '' },
      ]);
    } else {
      // existing chat
      setMessages((prev) => [
        ...prev,
        { role: Role.User, content: trimmed },
        { role: Role.Bot, content: '' },
      ]);
      await addMessage(db, parseInt(chatIdRef.current, 10), {
        content: trimmed,
        role: Role.User,
      });
    }

    const history: ChatTurn[] = [
      ...messages.map(
        (m) =>
          ({
            role: m.role === Role.Bot ? 'assistant' : 'user',
            content: m.content,
          } as ChatTurn)
      ),
      { role: 'user', content: trimmed },
    ];

    setPending(true);
    try {
      const reply = await askServerChat(trimmed, history);
      setMessages((prev) => {
        const next = prev.slice();
        const i = next.length - 1;
        if (i >= 0 && next[i].role === Role.Bot && next[i].content === '') {
          next[i] = { ...next[i], content: reply };
        }
        return next;
      });
      if (chatIdRef.current) {
        await addMessage(db, parseInt(chatIdRef.current, 10), {
          content: reply,
          role: Role.Bot,
        });
      }
    } catch (err: any) {
      setMessages((prev) => {
        const next = prev.slice();
        const i = next.length - 1;
        if (i >= 0 && next[i].role === Role.Bot && next[i].content === '') {
          next[i] = {
            ...next[i],
            content: 'Error: ' + (err?.message || 'request failed'),
          };
        }
        return next;
      });
    } finally {
      setPending(false);
    }
  };

  const handleNewChat = () => {
    loadIdeas();
    router.push('/(auth)/(drawer)/(chat)/new');
  };

  const { isSignedIn } = useAuth();

  return (
    <View style={defaultStyles.pageContainer}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <HeaderDropDown
              title="GospelAI"
              onPress={() =>
                isSignedIn
                  ? router.replace('/(auth)/(drawer)/(chat)/new')
                  : router.replace('/')
              }
            />
          ),
          headerStyle: { backgroundColor: Colors.header_bg },
          headerTintColor: Colors.header_txt,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.page}>
        {messages.length === 0 ? (
          <FlashList<{ key: string }>
            data={[{ key: 'empty-home' }]}
            renderItem={() => (
              <View>
                <View style={styles.logoContainer}>
                  <Image
                    source={require('@/assets/images/logo-white.png')}
                    style={styles.image}
                  />
                </View>
                <VerseOfDay />
              </View>
            )}
            keyExtractor={(item) => item.key}
            {...({ estimatedItemSize: 300 } as any)}
            contentContainerStyle={{ paddingTop: 30, paddingBottom: 260 }}
            keyboardDismissMode="on-drag"
          />
        ) : (
          <FlashList<Message>
            data={messages}
            renderItem={({ item, index }: ListRenderItemInfo<Message>) => (
              <ChatMessage
                {...item}
                loading={
                  pending &&
                  index === messages.length - 1 &&
                  item.role === Role.Bot &&
                  item.content === ''
                }
              />
            )}
            keyExtractor={(_: Message, i: number) => String(i)}
            {...({ estimatedItemSize: 400 } as any)}
            contentContainerStyle={{ paddingTop: 30, paddingBottom: 200 }}
            keyboardDismissMode="on-drag"
          />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={70}
        style={styles.kav}
      >
        {messages.length === 0 && (
          <MessageIdeas
            onSelectCard={getCompletion}
            ideas={ideas}
            loading={ideasLoading}
          />
        )}
        <MessageInput onShouldSend={getCompletion} onNewChat={handleNewChat} />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Chat background
  page: {
    flex: 1,
    backgroundColor: '#0b0b10', // --bg
  },

  // Centered logo when there are no messages
  logoContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: '#111217', // --panel
    borderWidth: 1,
    borderColor: '#1b1e29',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 8,
  },

  image: {
    width: 70,
    height: 70,
    resizeMode: 'cover',
  },

  // KeyboardAvoidingView wrapper at the bottom
  kav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    // slight fade like .composer background
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
  },
});

export default ChatPage;
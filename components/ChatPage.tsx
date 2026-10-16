// components/ChatPage.tsx
import ChatMessage from '@/components/ChatMessage';
import HeaderDropDown from '@/components/HeaderDropDown';
import MessageIdeas from '@/components/MessageIdeas';
import MessageInput from '@/components/MessageInput';
import VerseOfDay from '@/components/VerseOfDay';

import { defaultStyles } from '@/constants/Styles';
import { addChat, addMessage, getMessages } from '@/utils/Database';
import { Message, Role } from '@/utils/Interfaces';

import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import Colors from '@/constants/Colors';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-secret': APP_SECRET },
    body: JSON.stringify({ message, history }),
    signal: controller.signal,
  });
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  const data = await res.json();
  const reply = String(data.reply ?? '').trim();
  if (!reply) throw new Error('Empty response');
  return reply;
  } finally { clearTimeout(timeout); }
}

const ChatPage = () => {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id, draft, draftId } = useLocalSearchParams<{ id: string; draft?: string; draftId?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [failedTurn, setFailedTurn] = useState<{ text: string; history: ChatTurn[]; chatId: number } | null>(null);
  const busy = useRef(false);

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
    let cancelled = false;
    setChatError('');
    setFailedTurn(null);
    if (id) {
      setChatId(id);
      getMessages(db, parseInt(id, 10)).then(rows => { if (!cancelled) setMessages(rows); })
        .catch(() => { if (!cancelled) setChatError('Could not load this conversation. Reopen it to retry.'); });
    } else {
      setChatId(undefined);
      setMessages([]);
      loadIdeas();
    }
    return () => { cancelled = true; };
  }, [id, draftId, db, loadIdeas]);

  const requestReply = async (turn: { text: string; history: ChatTurn[]; chatId: number }) => {
    try {
      const reply = await askServerChat(turn.text, turn.history);
      await addMessage(db, turn.chatId, { content: reply, role: Role.Bot });
      setMessages(prev => [...prev.filter(m => !(m.role === Role.Bot && m.content === '')), { role: Role.Bot, content: reply }]);
      setFailedTurn(null);
      setChatError('');
    } catch {
      setMessages(prev => prev.filter(m => !(m.role === Role.Bot && m.content === '')));
      setFailedTurn(turn);
      setChatError('GospelAI could not finish this response. Check your connection and retry. Your message is saved on this device.');
    }
  };

  const getCompletion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy.current || failedTurn) return false;
    busy.current = true;
    setPending(true);
    setChatError('');
    try {
    let currentId = chatIdRef.current ? Number(chatIdRef.current) : undefined;
    if (!chatIdRef.current) {
      // first message of a brand new chat
      const res = await addChat(db, trimmed);
      const newId = String(res.lastInsertRowId);
      setChatId(newId);
      currentId = Number(newId);
    }
      await addMessage(db, currentId!, { content: trimmed, role: Role.User });
      setMessages((prev) => [
        ...prev,
        { role: Role.User, content: trimmed },
        { role: Role.Bot, content: '' },
      ]);

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

      await requestReply({ text: trimmed, history, chatId: currentId! });
      return true;
    } catch {
      setChatError('Could not save your message on this device. Please try sending again.');
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const handleNewChat = () => {
    loadIdeas();
    router.push('/(auth)/(drawer)/(chat)/new');
  };

  return (
    <View style={defaultStyles.pageContainer}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <HeaderDropDown
              title="GospelAI"
              onPress={() => router.replace('/(auth)/(drawer)/today')}
            />
          ),
          headerStyle: { backgroundColor: Colors.header_bg },
          headerTintColor: Colors.header_txt,
          headerShadowVisible: false,
        }}
      />
      <Text style={{ color: '#b8bcc7', backgroundColor: '#0b0b10', padding: 12, fontSize: 12 }}>
        AI-generated explanations, not Bible text. AI requires an internet connection. Review verse drafts, then tap Send.
      </Text>

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
            onSelectCard={(text) => { if (!pending && !failedTurn) void getCompletion(text); }}
            ideas={ideas}
            loading={ideasLoading}
          />
        )}
        {!!chatError && <View style={{ padding: 14, backgroundColor: '#171922' }}>
          <Text accessibilityRole="alert" style={{ color: '#ffa6a6', lineHeight: 20 }}>{chatError}</Text>
          {!!failedTurn && <View style={{ flexDirection: 'row', gap: 24 }}>
            <Pressable accessibilityRole="button" disabled={pending} style={{ paddingVertical: 12 }} onPress={async () => {
              if (!failedTurn || busy.current) return;
              busy.current = true; setPending(true); setChatError('');
              setMessages(prev => [...prev, { role: Role.Bot, content: '' }]);
              try { await requestReply(failedTurn); } finally { busy.current = false; setPending(false); }
            }}><Text style={{ color: '#57d99e' }}>{pending ? 'Retrying…' : 'Retry response'}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={pending} style={{ paddingVertical: 12 }} onPress={() => { setFailedTurn(null); setChatError(''); }}><Text style={{ color: '#b8bcc7' }}>Dismiss</Text></Pressable>
          </View>}
        </View>}
        <MessageInput onShouldSend={getCompletion} onNewChat={handleNewChat} draft={draft} draftId={draftId} disabled={pending || !!failedTurn} />
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
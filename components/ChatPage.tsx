// components/ChatPage.tsx
import HeaderDropDown from '@/components/HeaderDropDown';
import MessageInput from '@/components/MessageInput';
import MessageIdeas from '@/components/MessageIdeas';
import ChatMessage from '@/components/ChatMessage';

import { defaultStyles } from '@/constants/Styles';
import { addChat, addMessage, getMessages } from '@/utils/Database';
import { Message, Role } from '@/utils/Interfaces';

import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';

// ---- call your own backend (no client key) ----
const API_BASE = 'https://YOUR-RAILWAY-DOMAIN.up.railway.app/api';
const APP_SECRET = 'your-mobile-app-secret';
type ChatTurn = { role: 'user' | 'assistant'; content: string };

async function askServerChat(message: string, history: ChatTurn[]) {
  const res = await fetch(`${API_BASE}/mobile/chat`, {
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
  const { id } = useLocalSearchParams<{ id: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  const [chatId, _setChatId] = useState<string | undefined>(id);
  const chatIdRef = useRef<string | undefined>(chatId);
  const setChatId = (v: string) => { chatIdRef.current = v; _setChatId(v); };

  useEffect(() => { if (id) getMessages(db, parseInt(id, 10)).then(setMessages); }, [id]);

  const getCompletion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!chatIdRef.current) {
      const res = await addChat(db, trimmed);
      const newId = String(res.lastInsertRowId);
      setChatId(newId);
      await addMessage(db, parseInt(newId, 10), { content: trimmed, role: Role.User });
      setMessages([{ role: Role.User, content: trimmed }, { role: Role.Bot, content: '' }]);
    } else {
      setMessages(prev => [...prev, { role: Role.User, content: trimmed }, { role: Role.Bot, content: '' }]);
      await addMessage(db, parseInt(chatIdRef.current, 10), { content: trimmed, role: Role.User });
    }

    const history: ChatTurn[] = [
      ...messages.map(m => ({ role: m.role === Role.Bot ? 'assistant' : 'user', content: m.content } as ChatTurn)),
      { role: 'user', content: trimmed },
    ];

    setPending(true);
    try {
      const reply = await askServerChat(trimmed, history);
      setMessages(prev => {
        const next = prev.slice();
        const i = next.length - 1;
        if (i >= 0 && next[i].role === Role.Bot && next[i].content === '') {
          next[i] = { ...next[i], content: reply };
        }
        return next;
      });
      if (chatIdRef.current) {
        await addMessage(db, parseInt(chatIdRef.current, 10), { content: reply, role: Role.Bot });
      }
    } catch (err: any) {
      setMessages(prev => {
        const next = prev.slice();
        const i = next.length - 1;
        if (i >= 0 && next[i].role === Role.Bot && next[i].content === '') {
          next[i] = { ...next[i], content: 'Error: ' + (err?.message || 'request failed') };
        }
        return next;
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={defaultStyles.pageContainer}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <HeaderDropDown
              title="GospelAI"
              items={[{ key: 'chat', title: 'Chat', icon: 'sparkles' }]}
              onSelect={() => {}}
              selected={'chat'}
            />
          ),
        }}
      />

      <View style={styles.page}>
        {messages.length === 0 && (
          <View style={styles.logoContainer}>
            <Image source={require('@/assets/images/logo-white.png')} style={styles.image} />
          </View>
        )}

        <FlashList
          data={messages}
          renderItem={({ item, index }) => (
            <ChatMessage
              {...item}
              loading={pending && index === messages.length - 1 && item.role === Role.Bot && item.content === ''}
            />
          )}
          keyExtractor={(_, i) => String(i)}
          estimatedItemSize={400}
          contentContainerStyle={{ paddingTop: 30, paddingBottom: 150 }}
          keyboardDismissMode="on-drag"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={70}
        style={styles.kav}
      >
        {messages.length === 0 && <MessageIdeas onSelectCard={getCompletion} />}
        <MessageInput onShouldSend={getCompletion} />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1 },
  logoContainer: {
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginTop: 80, width: 56, height: 56, backgroundColor: '#000', borderRadius: 56,
  },
  image: { width: 32, height: 32, resizeMode: 'cover' },
  kav: { position: 'absolute', bottom: 0, left: 0, width: '100%' },
});

export default ChatPage;
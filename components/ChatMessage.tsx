import Colors from '@/constants/Colors';
import { addNote } from '@/utils/Database';
import { Message, Role } from '@/utils/Interfaces';
import { useUser } from '@clerk/clerk-expo';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function VerseLinkedText({ text }: { text: string }) {
  const router = useRouter();
  const parts: React.ReactNode[] = [];

  const re =
    /\[\[([^\]]+)\]\]|([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s\d+:\d+(?:-\d+)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text))) {
    const start = m.index;
    const end = re.lastIndex;

    if (start > last) {
      parts.push(
        <Text key={`t-${last}`} style={styles.textSegment}>
          {text.slice(last, start)}
        </Text>,
      );
    }

    const ref = (m[1] || m[2] || '').trim();
    parts.push(
      <Pressable
        key={`v-${start}`}
        style={styles.versePressable}
        onPress={() =>
          router.navigate({
            pathname: '/(auth)/(drawer)/bible',
            params: { ref },
          })
        }
      >
        <Text style={styles.verseRef}>{ref}</Text>
      </Pressable>,
    );

    last = end;
  }

  if (last < text.length) {
    parts.push(
      <Text key={`t-${last}`} style={styles.textSegment}>
        {text.slice(last)}
      </Text>,
    );
  }

  return <View style={styles.inlineRow}>{parts}</View>;
}

const ChatMessage = ({
  content,
  role,
  imageUrl,
  prompt,
  loading,
}: Message & { loading?: boolean }) => {
  const router = useRouter();
  const { user } = useUser();
  const db = useSQLiteContext();
  const avatarUrl = user?.imageUrl || 'https://galaxies.dev/img/meerkat_2.jpg';
  const isBot = role === Role.Bot;

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Text copied to clipboard.');
  };

  const handleSaveNote = async (text: string) => {
    try {
      await addNote(db, text, 'chat', 'AI Response');
      Alert.alert('Saved', 'Note saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save note.');
    }
  };

  const goToImageModal = () => {
    if (!imageUrl) return;
    const url = `/(auth)/(modal)/image/${encodeURIComponent(
      imageUrl,
    )}?prompt=${encodeURIComponent(prompt || '')}`;
    router.push(url as `/(${string})`);
  };

  const paragraphs =
    isBot
      ? content
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [content];

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        {isBot && (
          <View style={styles.botAvatarWrap}>
            <Image
              source={require('@/assets/images/logo-white.png')}
              style={styles.botLogo}
            />
          </View>
        )}
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    );
  }

  if (imageUrl && content === '') {
    return (
      <View style={isBot ? styles.rowBot : styles.rowUser}>
        {isBot && (
          <View style={styles.botAvatarWrap}>
            <Image
              source={require('@/assets/images/logo-white.png')}
              style={styles.botLogo}
            />
          </View>
        )}
        <Pressable onPress={goToImageModal}>
          <Image source={{ uri: imageUrl }} style={styles.previewImage} />
        </Pressable>
        {!isBot && <Image source={{ uri: avatarUrl }} style={styles.avatar} />}
      </View>
    );
  }

  return (
    <>
      {paragraphs.map((p, idx) => {
        if (isBot) {
          return (
            <View key={idx} style={styles.rowBot}>
              <View style={styles.botAvatarWrap}>
                <Image
                  source={require('@/assets/images/logo-white.png')}
                  style={styles.botLogo}
                />
              </View>
              <Pressable
                style={[styles.bubble, styles.botBubble]}
                onLongPress={() => {
                  Alert.alert('Message Options', undefined, [
                    { text: 'Copy Text', onPress: () => handleCopy(p) },
                    { text: 'Save to Notes', onPress: () => handleSaveNote(p) },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <VerseLinkedText text={p} />
              </Pressable>
            </View>
          );
        }

        return (
          <View key={idx} style={styles.rowUser}>
            <Pressable
              style={[styles.bubble, styles.userBubble]}
              onLongPress={() => handleCopy(p)}
            >
              <Text style={styles.text}>{p}</Text>
            </Pressable>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  rowBot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    marginVertical: 6,
  },
  rowUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    marginVertical: 6,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginVertical: 6,
    gap: 8,
  },

  botAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  botLogo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 8,
    backgroundColor: '#111217',
  },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '80%',
  },
  botBubble: {
    backgroundColor: '#191b22',
    borderTopLeftRadius: 6,
  },
  userBubble: {
    backgroundColor: '#1f2430',
    borderTopRightRadius: 6,
  },

  text: {
    color: '#f3f4f6',
    fontSize: 16,
    lineHeight: 22,
  },

  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  textSegment: {
    color: '#f3f4f6',
    fontSize: 16,
    lineHeight: 22,
  },

  versePressable: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: '#23314f',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 4,
  },
  verseRef: {
    color: '#3b82f6',
    fontWeight: '700',
  },

  previewImage: {
    width: 240,
    height: 240,
    borderRadius: 10,
  },
});

export default ChatMessage;

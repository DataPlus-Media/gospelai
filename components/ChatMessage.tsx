import Colors from '@/constants/Colors';
import UserAvatar from '@/components/UserAvatar';
import { addNote } from '@/utils/Database';
import { Message, Role } from '@/utils/Interfaces';
import { useAuth, useUser } from '@clerk/clerk-expo';
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
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const db = useSQLiteContext();
  const isBot = role === Role.Bot;
  const avatarProps = {
    isSignedIn,
    firstName: user?.firstName,
    lastName: user?.lastName,
    fallbackName: user?.username || user?.primaryEmailAddress?.emailAddress,
    size: 34,
    radius: 17,
    style: styles.avatar,
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Text copied.');
  };

  const handleSaveNote = async (text: string) => {
    try {
      await addNote(db, text, 'chat', 'AI Response');
      Alert.alert('Saved', 'Note saved.');
    } catch {
      Alert.alert('Couldn’t save note', 'Please try again.');
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
        {!isBot && <UserAvatar {...avatarProps} />}
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
                  Alert.alert('Message options', undefined, [
                    { text: 'Copy text', onPress: () => handleCopy(p) },
                    { text: 'Save to notes', onPress: () => handleSaveNote(p) },
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
            <UserAvatar {...avatarProps} />
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
    backgroundColor: Colors.surface,
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
    marginLeft: 8,
  },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '80%',
  },
  botBubble: {
    backgroundColor: Colors.surfaceRaised,
    borderTopLeftRadius: 6,
  },
  userBubble: {
    backgroundColor: Colors.plum,
    borderTopRightRadius: 6,
  },

  text: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
  },

  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  textSegment: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
  },

  versePressable: {
    backgroundColor: 'rgba(143,215,229,0.13)',
    borderWidth: 1,
    borderColor: '#754642',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 4,
  },
  verseRef: {
    color: Colors.coralSoft,
    fontWeight: '700',
  },

  previewImage: {
    width: 240,
    height: 240,
    borderRadius: 10,
  },
});

export default ChatMessage;

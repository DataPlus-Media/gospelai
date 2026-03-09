import { openBibleDb } from '@/utils/bibleDb';
import { getTodaysVerse, VotdEntry } from '@/utils/verseOfDay';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const FALLBACK_ENTRY: VotdEntry = {
  ref: 'John 3:16',
  book: 'John',
  bookId: 43,
  chapter: 3,
  verse: 16,
};

function safeGetTodaysVerse(): VotdEntry {
  try {
    return getTodaysVerse();
  } catch {
    return FALLBACK_ENTRY;
  }
}

export default function VerseOfDay() {
  const router = useRouter();
  const entryRef = useRef<VotdEntry>(safeGetTodaysVerse());
  const entry = entryRef.current;

  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openBibleDb();
        let row: { text: string } | null = null;
        try {
          row = await db.getFirstAsync<{ text: string }>(
            'SELECT text FROM verse WHERE book_id = ? AND chapter = ? AND verse = ?',
            [entry.bookId, entry.chapter, entry.verse]
          );
        } catch {
          row = await db.getFirstAsync<{ text: string }>(
            'SELECT text FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?',
            [entry.bookId, entry.chapter, entry.verse]
          );
        }
        if (!cancelled) {
          if (row?.text) {
            setText(row.text);
          } else {
            setFailed(true);
          }
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (failed) return null;

  const doShare = async () => {
    try {
      await Share.share({
        message: `"${text}" — ${entry.ref} (KJV)\n\nShared from GospelAI`,
      });
    } catch {
      Alert.alert('Error', 'Could not open share sheet.');
    }
  };

  const onShare = () => {
    if (!text) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share Verse'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
        },
        (index) => { if (index === 1) doShare(); }
      );
    } else {
      doShare();
    }
  };

  const navigateToVerse = () => {
    try {
      router.navigate({
        pathname: '/(auth)/(drawer)/bible',
        params: { ref: entry.ref },
      });
    } catch {}
  };

  return (
    <Pressable onPress={navigateToVerse} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.labelWrap}>
          <Text style={styles.labelIcon}>✦</Text>
          <Text style={styles.label}>Verse of the Day</Text>
        </View>
        <Pressable onPress={onShare} hitSlop={10} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={19} color="#c8a951" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.skeleton}>
          <View style={[styles.skLine, { width: '100%' }]} />
          <View style={[styles.skLine, { width: '85%' }]} />
          <View style={[styles.skLine, { width: '70%' }]} />
        </View>
      ) : (
        <Text style={styles.verseText}>"{text}"</Text>
      )}

      <Text style={styles.ref}>{entry.ref} · KJV</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#111217',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a2e14',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  labelIcon: {
    color: '#c8a951',
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c8a951',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareBtn: {
    padding: 4,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#f3f4f6',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  ref: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c8a951',
    textAlign: 'right',
  },
  skeleton: {
    gap: 8,
    marginBottom: 10,
  },
  skLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1e2030',
  },
});

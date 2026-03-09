import Colors from '@/constants/Colors';
import { openBibleDb } from '@/utils/bibleDb';
import { getTodaysVerse } from '@/utils/verseOfDay';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
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
import ViewShot from 'react-native-view-shot';

export default function VerseOfDay() {
  const router = useRouter();
  const entry = getTodaysVerse();
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<ViewShot>(null);

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
        if (!cancelled && row?.text) setText(row.text);
      } catch {
        if (!cancelled) setText('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const shareText = async () => {
    await Share.share({
      message: `"${text}" — ${entry.ref} (KJV)\n\nShared from GospelAI`,
    });
  };

  const saveImage = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to save the verse card.');
      return;
    }
    try {
      const uri = await (cardRef.current as any).capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'Verse card saved to your photo library. You can now set it as a photo widget on your home screen.');
    } catch {
      Alert.alert('Error', 'Could not save image.');
    }
  };

  const onShare = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share Text', 'Save as Widget Image'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
        },
        (index) => {
          if (index === 1) shareText();
          else if (index === 2) saveImage();
        }
      );
    } else {
      Alert.alert('Share Verse', undefined, [
        { text: 'Share Text', onPress: shareText },
        { text: 'Save as Widget Image', onPress: saveImage },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const navigateToVerse = () => {
    router.navigate({
      pathname: '/(auth)/(drawer)/bible',
      params: { ref: entry.ref },
    });
  };

  return (
    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }} style={styles.shotWrap}>
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
    </ViewShot>
  );
}

const styles = StyleSheet.create({
  shotWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
  },
  card: {
    backgroundColor: '#111217',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a2e14',
    shadowColor: '#c8a951',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
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

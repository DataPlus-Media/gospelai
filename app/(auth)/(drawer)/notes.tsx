import { deleteNote, getNotes, Note } from '@/utils/Database';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotesScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);

  const loadNotes = useCallback(async () => {
    try {
      const rows = await getNotes(db);
      setNotes(rows);
    } catch {
      Alert.alert('Couldn’t load notes', 'Please try again.');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const confirmDelete = (id: number) => {
    Alert.alert('Delete this note?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(db, id);
          loadNotes();
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'Z');
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderNote = ({ item }: { item: Note }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.badge,
            item.source === 'bible' ? styles.badgeBible : styles.badgeChat,
          ]}
        >
          <Text style={styles.badgeText}>
            {item.source === 'bible' ? 'Bible' : 'Chat'}
          </Text>
        </View>
        {item.reference ? (
          <Text style={styles.reference} numberOfLines={1}>
            {item.reference}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete note${item.reference ? ` for ${item.reference}` : ''}`}
          onPress={() => confirmDelete(item.id)}
          hitSlop={12}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.coral} />
        </Pressable>
      </View>
      <Text style={styles.content} numberOfLines={4}>
        {item.content}
      </Text>
      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {notes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="document-text-outline" size={48} color={Colors.borderStrong} />
          <Text style={styles.emptyText}>You haven’t saved any notes yet</Text>
          <Text style={styles.emptyHint}>
            Press and hold a chat message or Bible verse to save a note.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNote}
          contentContainerStyle={[
            styles.list,
            { width: '100%', maxWidth: 840, alignSelf: 'center', paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 14,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBible: {
    backgroundColor: 'rgba(143,215,229,0.14)',
  },
  badgeChat: {
    backgroundColor: 'rgba(201,170,165,0.13)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.coral,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reference: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: '#A9A1A0',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});

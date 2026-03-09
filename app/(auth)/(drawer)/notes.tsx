import Colors from '@/constants/Colors';
import { deleteNote, getNotes, Note } from '@/utils/Database';
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

export default function NotesScreen() {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);

  const loadNotes = useCallback(async () => {
    try {
      const rows = await getNotes(db);
      setNotes(rows);
    } catch {
      Alert.alert('Error', 'Failed to load notes.');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const confirmDelete = (id: number) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
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
          onPress={() => confirmDelete(item.id)}
          hitSlop={12}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
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
          <Ionicons name="document-text-outline" size={48} color="#3a3d4a" />
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptyHint}>
            Long-press on a chat message or Bible verse to save a note.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNote}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  list: {
    padding: 14,
    gap: 10,
  },
  card: {
    backgroundColor: '#111217',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(234,179,8,0.15)',
  },
  badgeChat: {
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d4d4d8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reference: {
    flex: 1,
    fontSize: 13,
    color: '#8a90a2',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
  content: {
    fontSize: 15,
    color: '#f3f4f6',
    lineHeight: 22,
  },
  date: {
    fontSize: 12,
    color: '#555a6a',
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
    color: '#555a6a',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: '#3a3d4a',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});

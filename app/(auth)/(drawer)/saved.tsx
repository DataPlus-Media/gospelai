import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StudyNoteEditor from '@/components/StudyNoteEditor';
import { BOOKS } from '@/constants/bibleBooks';
import Colors from '@/constants/Colors';
import { scriptureFontFamily, spacing, typography } from '@/constants/DesignTokens';
import { Note } from '@/utils/Database';
import { getSavedVerses, referenceOf, SavedVerse, toggleSavedVerse } from '@/utils/study';
import { loadStudyNotes, removeStudyNote, saveStudyNote } from '@/utils/studyNotes';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'bookmarks' | 'notes' | 'highlights';
type SavedListItem = { type: 'verse'; verse: SavedVerse } | { type: 'note'; note: Note };
const NOTES_FILTER_KEY = 'saved.notesBookFilter.v1';
const HIGHLIGHTS_FILTER_KEY = 'saved.highlightsBookFilter.v1';

function noteBook(reference: string) {
  return BOOKS.find(book => reference.trim().startsWith(book.name))?.name ?? null;
}

function passageRef(reference: string) {
  const match = /(?:^|\s)([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(\d+):(\d+)/.exec(reference);
  const book = match && BOOKS.find(item => item.name.toLowerCase() === match[1].trim().toLowerCase());
  return book && match ? `${book.name} ${match[2]}:${match[3]}` : null;
}

export default function SavedScreen() {
  return <StudySavedScreen />;
}

export function StudySavedScreen({ initialTab = 'bookmarks', notesOnly = false }: { initialTab?: Tab; notesOnly?: boolean }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const signedInRef = useRef(!!isSignedIn);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [items, setItems] = useState<SavedVerse[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesBook, setNotesBook] = useState('All books');
  const [highlightsBook, setHighlightsBook] = useState('All books');
  const [filterReady, setFilterReady] = useState(false);
  const [filterTarget, setFilterTarget] = useState<'notes' | 'highlights' | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (signedInRef.current !== !!isSignedIn) {
      signedInRef.current = !!isSignedIn;
      setNotes([]);
    }
    try {
      const [saved, savedNotes, storedNotesBook, storedHighlightsBook] = await Promise.all([
        getSavedVerses(db),
        loadStudyNotes(db, !!isSignedIn, () => getTokenRef.current()),
        AsyncStorage.getItem(NOTES_FILTER_KEY),
        AsyncStorage.getItem(HIGHLIGHTS_FILTER_KEY),
      ]);
      setItems(saved);
      setNotes(savedNotes);
      if (storedNotesBook && (storedNotesBook === 'All books' || BOOKS.some(book => book.name === storedNotesBook))) setNotesBook(storedNotesBook);
      if (storedHighlightsBook && (storedHighlightsBook === 'All books' || BOOKS.some(book => book.name === storedHighlightsBook))) setHighlightsBook(storedHighlightsBook);
      setError('');
      setFilterReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We couldn’t load your saved items. Try again.');
    }
  }, [db, isSignedIn]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleItems = useMemo(
    () => items.filter(item => item.kind === (tab === 'highlights' ? 'highlight' : 'bookmark')),
    [items, tab],
  );
  const visibleNotes = useMemo(
    () => notes.filter(note => notesBook === 'All books' || noteBook(note.reference) === notesBook),
    [notes, notesBook],
  );
  async function removeVerse(item: SavedVerse) {
    try {
      await toggleSavedVerse(db, item, true);
      setItems(current => current.filter(saved => !(saved.book === item.book && saved.chapter === item.chapter && saved.verse === item.verse && saved.kind === item.kind)));
      setError('');
    } catch { setError(`We couldn’t remove this ${item.kind}. Try again.`); }
  }

  async function deleteNote(note: Note) {
    try {
      await removeStudyNote(db, !!isSignedIn, getToken, note.id);
      setNotes(current => current.filter(item => item.id !== note.id));
      setError('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We couldn’t delete this note. Try again.'); }
  }

  async function saveEditedNote(content: string) {
    if (!editing) return;
    await saveStudyNote(db, !!isSignedIn, getToken, {
      content, source: editing.source, reference: editing.reference,
    }, editing.id);
    await load();
    setEditing(null);
  }

  async function saveFilter(which: 'notes' | 'highlights', value: string) {
    try {
      await AsyncStorage.setItem(which === 'notes' ? NOTES_FILTER_KEY : HIGHLIGHTS_FILTER_KEY, value);
      if (which === 'notes') setNotesBook(value);
      else setHighlightsBook(value);
      setFilterTarget(null);
      setError('');
    } catch {
      setError('We couldn’t save this book filter. Please try again.');
    }
  }

  const activeVerseItems = visibleItems;
  const listItems: SavedListItem[] = tab === 'notes'
    ? visibleNotes.map(note => ({ type: 'note', note }))
    : activeVerseItems.map(verse => ({ type: 'verse', verse }));
  const activeFilter = tab === 'notes' ? notesBook : highlightsBook;
  const emptyText = tab === 'notes'
    ? `No notes for ${notesBook === 'All books' ? 'any book' : notesBook} yet.`
    : tab === 'highlights'
      ? `No highlights for ${highlightsBook === 'All books' ? 'any book' : highlightsBook} yet.`
      : 'No bookmarks yet. Tap a verse in the Bible to bookmark it.';

  return (
    <View style={s.page}>
      <Text style={s.hint}>
        {isSignedIn
          ? 'Your notes sync with your account. Bookmarks and highlights stay on this device.'
          : 'Your notes, bookmarks and highlights are saved on this device.'}
      </Text>
      {!notesOnly && <View style={s.tabs}>
        {(['bookmarks', 'notes', 'highlights'] as const).map(value => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)} style={[s.tab, tab === value && s.tabActive]}>
            <Text style={[s.tabText, tab === value && s.tabTextActive]}>{value === 'bookmarks' ? 'Bookmarks' : value === 'notes' ? 'Notes' : 'Highlights'}</Text>
          </Pressable>
        ))}
      </View>}
      {tab !== 'bookmarks' && (
        <View style={s.filterRow}>
          <Text style={s.filterLabel}>{tab === 'notes' ? 'Notes in' : 'Highlights in'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${tab === 'notes' ? 'Notes' : 'Highlights'} book filter: ${activeFilter}`}
            onPress={() => setFilterTarget(tab)} style={s.filterButton}>
            <Text style={s.filterText}>{activeFilter}</Text><Ionicons name="chevron-down" size={16} color={Colors.coralSoft} />
          </Pressable>
        </View>
      )}
      {!!error && <Pressable accessibilityRole="button" onPress={() => void load()}><Text accessibilityRole="alert" style={s.error}>{error} Tap to retry.</Text></Pressable>}
      {!filterReady ? <Text style={s.hint}>Loading saved items…</Text> : (
        <FlatList
          data={listItems}
          keyExtractor={item => item.type === 'verse' ? `${referenceOf(item.verse)}-${item.verse.kind}` : `note-${item.note.id}`}
          style={s.list}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
          ListEmptyComponent={<Text style={s.empty}>{emptyText}</Text>}
          renderItem={({ item }) => item.type === 'verse' ? (
            <View style={s.card}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Read ${referenceOf(item.verse)}`}
                onPress={() => router.navigate({ pathname: '/(auth)/(drawer)/bible', params: { ref: referenceOf(item.verse), jump: String(Date.now()) } })}>
                <Text style={s.ref}>{referenceOf(item.verse)} · KJV · {item.verse.kind}</Text>
                <Text style={s.text}>{item.verse.text}</Text>
                <Text style={s.link}>Open this verse</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.verse.kind} for ${referenceOf(item.verse)}`}
                onPress={() => void removeVerse(item.verse)} style={s.remove}>
                <Ionicons name="trash-outline" size={16} color={Colors.coralSoft} /><Text style={s.error}>Remove {item.verse.kind}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.ref}>{item.note.reference || 'Personal note'} · {item.note.source === 'bible' ? 'Bible' : item.note.source === 'chat' ? 'Chat' : item.note.source}</Text>
              {!!passageRef(item.note.reference) && (
                <Pressable accessibilityRole="link" accessibilityLabel={`Open ${passageRef(item.note.reference)} in Bible`}
                  onPress={() => router.navigate({ pathname: '/(auth)/(drawer)/bible', params: { ref: passageRef(item.note.reference)!, jump: String(Date.now()) } })}>
                  <Text style={s.link}>Open this passage</Text>
                </Pressable>
              )}
              <Text style={s.text}>{item.note.content}</Text>
              <View style={s.noteActions}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Edit note${item.note.reference ? ` for ${item.note.reference}` : ''}`}
                  onPress={() => setEditing(item.note)} style={s.actionButton}><Ionicons name="create-outline" size={17} color={Colors.coralSoft} /><Text style={s.actionText}>Edit</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete note${item.note.reference ? ` for ${item.note.reference}` : ''}`}
                  onPress={() => void deleteNote(item.note)} style={s.actionButton}><Ionicons name="trash-outline" size={17} color={Colors.coralSoft} /><Text style={s.actionText}>Delete</Text></Pressable>
              </View>
            </View>
          )}
        />
      )}
      <Modal visible={!!filterTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFilterTarget(null)}>
        <View style={s.filterModal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Choose a Bible book</Text><Pressable accessibilityRole="button" onPress={() => setFilterTarget(null)}><Text style={s.link}>Close</Text></Pressable></View>
          <FlatList
            data={['All books', ...BOOKS.map(book => book.name)]}
            initialNumToRender={67}
            keyExtractor={value => value}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: item === activeFilter }}
                onPress={() => filterTarget && void saveFilter(filterTarget, item)} style={s.bookOption}>
                <Text style={[s.bookOptionText, item === activeFilter && s.bookOptionActive]}>{item}</Text>
                {item === activeFilter && <Ionicons name="checkmark" size={18} color={Colors.coralSoft} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
      <StudyNoteEditor visible={!!editing} isEditing initialContent={editing?.content ?? ''} reference={editing?.reference}
        onClose={() => setEditing(null)} onSave={saveEditedNote} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { width: '100%', maxWidth: 840, alignSelf: 'center' },
  hint: { width: '100%', maxWidth: 840, alignSelf: 'center', color: Colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', width: '100%', maxWidth: 840, alignSelf: 'center', gap: 7, marginBottom: spacing.md },
  tab: { flex: 1, minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.plum, borderColor: Colors.borderStrong },
  tabText: { color: Colors.textMuted, fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: Colors.text },
  filterRow: { width: '100%', maxWidth: 840, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  filterLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterButton: { minHeight: 44, minWidth: 144, maxWidth: '65%', paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filterText: { color: Colors.text, fontWeight: '700', flexShrink: 1 },
  card: { padding: spacing.lg, backgroundColor: Colors.surface, borderRadius: 16, marginBottom: spacing.md, borderColor: Colors.border, borderWidth: 1 },
  text: { color: Colors.scripture, fontSize: typography.reading, lineHeight: typography.readingLineHeight, marginVertical: spacing.md, fontFamily: scriptureFontFamily },
  ref: { color: Colors.coral, fontWeight: '700' },
  link: { color: Colors.coralSoft, paddingVertical: spacing.sm, fontWeight: '600' },
  error: { color: Colors.coralSoft, paddingVertical: spacing.sm },
  empty: { width: '100%', maxWidth: 840, alignSelf: 'center', color: Colors.textMuted, lineHeight: 22, paddingVertical: spacing.lg },
  remove: { minHeight: 44, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  noteActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, gap: 10 },
  actionButton: { minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: Colors.coralSoft, fontWeight: '700' },
  filterModal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { minHeight: 60, paddingHorizontal: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  bookOption: { minHeight: 48, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookOptionText: { color: Colors.text, fontSize: 15 },
  bookOptionActive: { color: Colors.coralSoft, fontWeight: '700' },
});

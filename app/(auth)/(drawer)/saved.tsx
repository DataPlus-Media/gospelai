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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const { isSignedIn, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const signedInRef = useRef(!!isSignedIn);
  const [category, setCategory] = useState<Tab | null>(notesOnly ? initialTab : null);
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

  const tab = category ?? 'bookmarks';
  const bookmarkItems = useMemo(() => items.filter(item => item.kind === 'bookmark'), [items]);
  const highlightItems = useMemo(() => items.filter(item => item.kind === 'highlight'), [items]);
  const visibleHighlights = useMemo(
    () => highlightItems.filter(item => highlightsBook === 'All books' || item.book === highlightsBook),
    [highlightItems, highlightsBook],
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

  const listItems: SavedListItem[] = tab === 'notes'
    ? visibleNotes.map(note => ({ type: 'note', note }))
    : (tab === 'highlights' ? visibleHighlights : bookmarkItems).map(verse => ({ type: 'verse', verse }));
  const activeFilter = tab === 'notes' ? notesBook : highlightsBook;
  const emptyText = tab === 'notes'
    ? `No notes for ${notesBook === 'All books' ? 'any book' : notesBook} yet.`
    : tab === 'highlights'
      ? `No highlights for ${highlightsBook === 'All books' ? 'any book' : highlightsBook} yet.`
      : 'No bookmarks yet. Tap a verse in the Bible to bookmark it.';
  const modalFilter = filterTarget === 'notes' ? notesBook
    : filterTarget === 'highlights' ? highlightsBook
      : activeFilter;
  const categories: { key: Tab; title: string; description: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'notes', title: 'Notes', description: 'Your personal reflections', count: notes.length, icon: 'document-text-outline' },
    { key: 'bookmarks', title: 'Bookmarks', description: 'Verses saved for later', count: bookmarkItems.length, icon: 'bookmark-outline' },
    { key: 'highlights', title: 'Highlights', description: 'Verses marked in your Bible', count: highlightItems.length, icon: 'color-wand-outline' },
  ];
  const categoryTitle = categories.find(item => item.key === category)?.title ?? 'Saved';
  const pageWidth = width >= 900 ? 840 : width >= 600 ? 720 : undefined;

  useEffect(() => {
    if (Platform.OS === 'web' || category === null) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setCategory(null);
      return true;
    });
    return () => subscription.remove();
  }, [category]);

  const renderVerseCard = (item: SavedVerse) => (
    <View style={s.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Read ${referenceOf(item)}`}
        onPress={() => router.navigate({ pathname: '/(auth)/(drawer)/bible', params: { ref: referenceOf(item), jump: String(Date.now()) } })}>
        <Text style={s.ref}>{referenceOf(item)} · KJV · {item.kind}</Text>
        <Text style={s.text}>{item.text}</Text>
        <Text style={s.link}>Open this verse</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.kind} for ${referenceOf(item)}`}
        onPress={() => void removeVerse(item)} style={s.remove}>
        <Ionicons name="trash-outline" size={16} color={Colors.coralSoft} /><Text style={s.error}>Remove {item.kind}</Text>
      </Pressable>
    </View>
  );

  const renderNoteCard = (note: Note) => (
    <View style={s.card}>
      <Text style={s.ref}>{note.reference || 'Personal note'} · {note.source === 'bible' ? 'Bible' : note.source === 'chat' ? 'Chat' : note.source}</Text>
      {!!passageRef(note.reference) && (
        <Pressable accessibilityRole="link" accessibilityLabel={`Open ${passageRef(note.reference)} in Bible`}
          onPress={() => router.navigate({ pathname: '/(auth)/(drawer)/bible', params: { ref: passageRef(note.reference)!, jump: String(Date.now()) } })}>
          <Text style={s.link}>Open this passage</Text>
        </Pressable>
      )}
      <Text style={s.text}>{note.content}</Text>
      <View style={s.noteActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit note${note.reference ? ` for ${note.reference}` : ''}`}
          onPress={() => setEditing(note)} style={s.actionButton}><Ionicons name="create-outline" size={17} color={Colors.coralSoft} /><Text style={s.actionText}>Edit</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete note${note.reference ? ` for ${note.reference}` : ''}`}
          onPress={() => void deleteNote(note)} style={s.actionButton}><Ionicons name="trash-outline" size={17} color={Colors.coralSoft} /><Text style={s.actionText}>Delete</Text></Pressable>
      </View>
    </View>
  );

  return (
    <View style={s.page}>
      {!!error && <Pressable accessibilityRole="button" onPress={() => void load()}><Text accessibilityRole="alert" style={s.error}>{error} Tap to retry.</Text></Pressable>}
      {!filterReady ? <Text style={s.hint}>Loading saved items…</Text> : category === null ? (
        <ScrollView style={s.overviewScroll} contentContainerStyle={[s.overviewContent, { maxWidth: pageWidth, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}>
          <Text style={s.eyebrow}>YOUR STUDY COLLECTION</Text>
          <Text style={s.pageTitle}>Saved</Text>
          <Text style={s.hint}>
            {isSignedIn
              ? 'Your notes sync with your account. Bookmarks and highlights stay on this device.'
              : 'Your notes, bookmarks and highlights are saved on this device.'}
          </Text>
          <View style={s.categoryList}>
            {categories.map(item => (
              <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.count} ${item.count === 1 ? 'item' : 'items'}`}
                onPress={() => setCategory(item.key)} style={({ pressed }) => [s.categoryRow, pressed && s.categoryRowPressed]}>
                <View style={s.categoryIcon}><Ionicons name={item.icon} size={21} color={Colors.coralSoft} /></View>
                <View style={s.categoryCopy}>
                  <Text style={s.categoryTitle}>{item.title}</Text>
                  <Text style={s.categoryDescription}>{item.description}</Text>
                </View>
                <View style={s.categoryMeta}>
                  <Text style={s.categoryCount}>{item.count}</Text>
                  <Text style={s.categoryCountLabel}>{item.count === 1 ? 'item' : 'items'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={[s.categoryPage, { maxWidth: pageWidth }]}>
          <View style={s.categoryHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Saved" onPress={() => setCategory(null)} style={s.backButton}>
              <Ionicons name="arrow-back" size={19} color={Colors.coralSoft} />
              <Text style={s.backText}>Saved</Text>
            </Pressable>
            <Text style={s.eyebrow}>YOUR STUDY COLLECTION</Text>
            <View style={s.categoryHeading}>
              <Text style={s.pageTitle}>{categoryTitle}</Text>
              <Text style={s.headingCount}>{categories.find(item => item.key === category)?.count ?? 0}</Text>
            </View>
            <Text style={s.hint}>
              {isSignedIn
                ? 'Your notes sync with your account. Bookmarks and highlights stay on this device.'
                : 'Your notes, bookmarks and highlights are saved on this device.'}
            </Text>
            {tab !== 'bookmarks' && (
              <View style={s.filterRow}>
                <Text style={s.filterLabel}>{tab === 'notes' ? 'Notes in' : 'Highlights in'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${tab === 'notes' ? 'Notes' : 'Highlights'} book filter: ${activeFilter}`}
                  onPress={() => setFilterTarget(tab)} style={s.filterButton}>
                  <Text style={s.filterText}>{activeFilter}</Text><Ionicons name="chevron-down" size={16} color={Colors.coralSoft} />
                </Pressable>
              </View>
            )}
          </View>
          <FlatList
            data={listItems}
            keyExtractor={item => item.type === 'verse' ? `${referenceOf(item.verse)}-${item.verse.kind}` : `note-${item.note.id}`}
            style={s.categoryItemsList}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }}
            ListEmptyComponent={<Text style={s.empty}>{emptyText}</Text>}
            renderItem={({ item }) => item.type === 'verse' ? renderVerseCard(item.verse) : renderNoteCard(item.note)}
          />
        </View>
      )}
      <Modal visible={!!filterTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFilterTarget(null)}>
        <View style={s.filterModal}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Choose a Bible book</Text><Pressable accessibilityRole="button" onPress={() => setFilterTarget(null)}><Text style={s.link}>Close</Text></Pressable></View>
          <FlatList
            data={['All books', ...BOOKS.map(book => book.name)]}
            initialNumToRender={67}
            keyExtractor={value => value}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: item === modalFilter }}
                onPress={() => filterTarget && void saveFilter(filterTarget, item)} style={s.bookOption}>
                <Text style={[s.bookOptionText, item === modalFilter && s.bookOptionActive]}>{item}</Text>
                {item === modalFilter && <Ionicons name="checkmark" size={18} color={Colors.coralSoft} />}
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
  overviewScroll: { flex: 1, width: '100%', alignSelf: 'center' },
  overviewContent: { width: '100%', alignSelf: 'center', paddingTop: spacing.xs },
  categoryPage: { flex: 1, width: '100%', alignSelf: 'center' },
  categoryHeader: { flexShrink: 0 },
  categoryItemsList: { flex: 1, width: '100%' },
  eyebrow: { color: Colors.coralSoft, fontSize: 11, letterSpacing: 2, fontWeight: '800', marginTop: spacing.xs, marginBottom: spacing.md },
  pageTitle: { color: Colors.text, fontSize: 32, lineHeight: 40, fontFamily: scriptureFontFamily, marginBottom: spacing.sm },
  categoryList: { gap: spacing.md, marginTop: spacing.lg },
  categoryRow: { minHeight: 82, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  categoryRowPressed: { borderColor: Colors.borderStrong, backgroundColor: Colors.plum },
  categoryIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  categoryCopy: { flex: 1, minWidth: 0 },
  categoryTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  categoryDescription: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  categoryMeta: { alignItems: 'flex-end', minWidth: 42 },
  categoryCount: { color: Colors.text, fontSize: 19, fontWeight: '800' },
  categoryCountLabel: { color: Colors.textMuted, fontSize: 11 },
  backButton: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.md },
  backText: { color: Colors.coralSoft, fontSize: 14, fontWeight: '700' },
  categoryHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingCount: { color: Colors.textMuted, fontSize: 16, fontWeight: '700', marginTop: -spacing.sm },
  hint: { width: '100%', maxWidth: 840, alignSelf: 'center', color: Colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
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

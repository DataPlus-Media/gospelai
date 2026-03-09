import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import HeaderDropDown from '@/components/HeaderDropDown';
import { BOOKS, BOOK_NAME_TO_ID } from '@/constants/bibleBooks';
import Colors from '@/constants/Colors';
import { addNote } from '@/utils/Database';

type VerseRow = { verse: number; text: string };

// Ensure the bundled DB exists, then open it.
async function openBibleDb(): Promise<SQLite.SQLiteDatabase> {
  const sqliteDir = `${FileSystem.documentDirectory ?? ''}SQLite`;
  const dbPath = `${sqliteDir}/kjv.sqlite`;

  const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
  }

  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  if (!dbInfo.exists) {
    const asset = Asset.fromModule(require('../assets/bible/kjv.sqlite'));
    await asset.downloadAsync();
    const from = asset.localUri ?? asset.uri;
    if (!from) throw new Error('Unable to locate bundled kjv.sqlite asset');
    await FileSystem.copyAsync({ from, to: dbPath });
  }

  return SQLite.openDatabaseAsync('kjv.sqlite');
}

// ---- tiny helper: parse "John 3:16" / "1 John 4:7-8" to {book, chapter, verse} (first verse if range)
function parseSimpleRef(refRaw: string | undefined): {
  book?: string;
  chapter?: number;
  verse?: number;
} {
  if (!refRaw) return {};
  const ref = refRaw.trim().replace(/\s+/g, ' ');
  // split into book name + "chapter:verse"
  const m = /(.*)\s+(\d+):(\d+)/i.exec(ref);
  if (!m) return {};
  const [, bookPart, chStr, vStr] = m;
  const chapter = parseInt(chStr, 10);
  const verse = parseInt(vStr, 10);

  // try to match book by startsWith (case-insensitive) against known names
  const target = bookPart.toLowerCase();
  const found =
    BOOKS.find((b) => b.name.toLowerCase() === target) ||
    BOOKS.find((b) => b.name.toLowerCase().startsWith(target));
  return { book: found?.name, chapter, verse };
}

export default function BibleScreen() {
  const { ref: refParam } = useLocalSearchParams<{ ref?: string }>();
  const appDb = useSQLiteContext();

  const handleCopyVerse = async (verseNum: number, text: string) => {
    const formatted = `${bookName} ${chapter}:${verseNum} — "${text}"`;
    await Clipboard.setStringAsync(formatted);
    Alert.alert('Copied', 'Verse copied to clipboard.');
  };

  const handleSaveVerse = async (verseNum: number, text: string) => {
    const reference = `${bookName} ${chapter}:${verseNum}`;
    try {
      await addNote(appDb, text, 'bible', reference);
      Alert.alert('Saved', 'Verse saved to notes.');
    } catch {
      Alert.alert('Error', 'Failed to save note.');
    }
  };

  const onVerseLongPress = (verseNum: number, text: string) => {
    Alert.alert('Verse Options', undefined, [
      { text: 'Copy Verse', onPress: () => handleCopyVerse(verseNum, text) },
      { text: 'Save to Notes', onPress: () => handleSaveVerse(verseNum, text) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Version dropdown (fixed to KJV for now)
  const [version, setVersion] = useState<'kjv'>('kjv');

  // DB + loading
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [error, setError] = useState<string>('');

  // Current reference
  const [bookName, setBookName] = useState<string>('Genesis');
  const [chapter, setChapter] = useState<number>(1);
  const [chapterInput, setChapterInput] = useState<string>('1'); // 🔹 input text for chapter

  // Highlighted verse (when navigated via ?ref=)
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null);

  // In-chapter search
  const [query, setQuery] = useState<string>('');

  // Verses
  const [rows, setRows] = useState<VerseRow[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  // flatlist ref to scroll to verse
  const listRef = useRef<FlatList<VerseRow>>(null);

  // ===== Books & Chapters modal (searchable) =====
  const [libOpen, setLibOpen] = useState(false);
  const [libBook, setLibBook] = useState<string>(bookName);
  const [libSearch, setLibSearch] = useState('');

  const filteredBooks = useMemo(() => {
    const q = libSearch.trim().toLowerCase();
    if (!q) return BOOKS;
    return BOOKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [libSearch]);

  const openLibrary = () => {
    Keyboard.dismiss();
    setLibBook(bookName);
    setLibSearch('');
    setLibOpen(true);
  };

  const applyRef = (bname: string, ch: number) => {
    setBookName(bname);
    setChapter(ch);
    setChapterInput(String(ch)); // 🔹 keep the input synced
    setQuery('');
    setLibOpen(false);
  };

  // Open DB
  useEffect(() => {
    (async () => {
      try {
        setLoadingDb(true);
        const dbase = await openBibleDb();
        setDb(dbase);
        setError('');
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to open Bible database.');
      } finally {
        setLoadingDb(false);
      }
    })();
  }, []);

  // Clamp chapter when book changes, and sync the input
  useEffect(() => {
    const meta = BOOKS.find((b) => b.name === bookName);
    if (!meta) return;

    let next = chapter;
    if (next > meta.chapters) next = meta.chapters;
    if (next < 1) next = 1;

    if (next !== chapter) {
      setChapter(next);
    }
    setChapterInput(String(next)); // 🔹 ensure the input shows a valid chapter for that book
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookName]);

  // If a ?ref= is provided, jump to it (book + chapter), and remember verse to highlight.
  useEffect(() => {
    const { book, chapter: ch, verse } = parseSimpleRef(refParam);
    if (book && ch) {
      setBookName(book);
      setChapter(ch);
      setChapterInput(String(ch)); // 🔹 sync input with deep link
      setHighlightVerse(Number.isFinite(verse as number) ? (verse as number) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refParam]);

  // Load verses on ref change
  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        setLoadingVerses(true);
        const bookId = BOOK_NAME_TO_ID[bookName];
        let out: VerseRow[] = [];
        try {
          out = await db.getAllAsync<VerseRow>(
            'SELECT verse, text FROM verse WHERE book_id = ? AND chapter = ? ORDER BY verse',
            [bookId, chapter]
          );
        } catch {
          out = await db.getAllAsync<VerseRow>(
            'SELECT verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse',
            [bookId, chapter]
          );
        }
        setRows(out);
        setError('');
      } catch (e: any) {
        console.error(e);
        setRows([]);
        setError(e?.message || 'Failed to load verses.');
      } finally {
        setLoadingVerses(false);
      }
    })();
  }, [db, bookName, chapter]);

  // After verses load, scroll to the highlighted verse (if any)
  useEffect(() => {
    if (!highlightVerse || rows.length === 0) return;
    const index = rows.findIndex((r) => r.verse === highlightVerse);
    if (index >= 0) {
      // index + 1 because ListHeaderComponent occupies index 0
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      });
    }
  }, [rows, highlightVerse]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.text.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <View style={styles.page}>
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderDropDown title="Bible" />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.header_bg },
          headerTintColor: Colors.header_txt,
        }}
      />

      {/* Main list with a sticky header for controls */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => String(item.verse)}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: 18 }}
        ListHeaderComponent={
          <>
            {/* Controls */}
            <View style={styles.controls}>
              {/* Book (opens searchable picker) */}
              <View style={styles.field}>
                <Text style={styles.label}>Book</Text>
                <Pressable onPress={openLibrary}>
                  <View pointerEvents="none" style={styles.selectLike}>
                    <TextInput value={bookName} editable={false} style={styles.input} />
                  </View>
                </Pressable>
              </View>

              {/* Chapter (editable by number, now behaves properly) */}
              <View style={styles.fieldSmall}>
                <Text style={styles.label}>Chapter</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={chapterInput}
                  onChangeText={(v) => {
                    // allow user to clear while typing
                    setChapterInput(v);

                    const n = parseInt(v, 10);
                    if (!Number.isNaN(n) && n >= 1) {
                      // optional: clamp to max chapters for that book
                      const meta = BOOKS.find((b) => b.name === bookName);
                      const maxCh = meta?.chapters ?? n;
                      const clamped = Math.min(n, maxCh);
                      setChapter(clamped);
                    }
                  }}
                  style={styles.input}
                />
              </View>

              {/* In-chapter search */}
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Find in chapter</Text>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Find words in this chapter…"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Section heading */}
            <Text style={[styles.heading, { paddingHorizontal: 14 }]}>
              {bookName} {chapter}
            </Text>
          </>
        }
        renderItem={({ item }) => {
          const isHit = item.verse === highlightVerse;
          return (
            <Pressable
              style={{ paddingHorizontal: 14 }}
              onLongPress={() => onVerseLongPress(item.verse, item.text)}
            >
              <View style={[styles.verseCard, isHit && styles.verseCardHit]}>
                <Text style={[styles.verseNum, isHit && styles.verseNumHit]}>{item.verse}</Text>
                <Text style={[styles.verseText, isHit && styles.verseTextHit]}>{item.text}</Text>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          loadingDb || loadingVerses ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.dimText}>Loading KJV…</Text>
            </View>
          ) : null
        }
        onScrollBeginDrag={() => {
          // if the user scrolls manually, remove the highlight after a moment
          if (highlightVerse) setTimeout(() => setHighlightVerse(null), 800);
        }}
        getItemLayout={(_, index) => ({
          length: 64, // approximate row height
          offset: 64 * index,
          index,
        })}
      />

      {/* Non-blocking error box */}
      {!!error && !loadingDb && !loadingVerses && (
        <View style={styles.errorBox}>
          <Text style={styles.dimText}>{error}</Text>
          <Text style={[styles.dimText, { marginTop: 6 }]}>
            Ensure the bundled DB exists at <Text style={styles.code}>assets/bible/kjv.sqlite</Text>.
          </Text>
        </View>
      )}

      {/* ===== Searchable Books & Chapters modal ===== */}
      <Modal
        visible={libOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLibOpen(false)}
      >
        <View style={styles.drawerRoot}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Books & Chapters</Text>
            <TouchableOpacity onPress={() => setLibOpen(false)}>
              <Text style={styles.drawerClose}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Search box */}
          <View style={styles.drawerSearch}>
            <TextInput
              placeholder="Search books (e.g., John, Romans)…"
              value={libSearch}
              onChangeText={setLibSearch}
              autoFocus
              style={styles.drawerSearchInput}
            />
          </View>

          {/* Two-pane content */}
          <View style={styles.drawerBody}>
            {/* Left: books list */}
            <View style={styles.booksPane}>
              <FlatList
                data={filteredBooks}
                keyExtractor={(b) => String(b.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.name === libBook;
                  return (
                    <TouchableOpacity
                      onPress={() => setLibBook(item.name)}
                      style={[styles.bookRow, active && styles.bookRowActive]}
                    >
                      <Text style={[styles.bookText, active && styles.bookTextActive]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* Right: chapters grid */}
            <View style={styles.chaptersPane}>
              <Text style={styles.chaptersTitle}>{libBook}</Text>
              <View style={styles.chaptersGrid}>
                {Array.from(
                  { length: BOOKS.find((b) => b.name === libBook)?.chapters || 1 },
                  (_, i) => i + 1
                ).map((ch) => {
                  const active = libBook === bookName && ch === chapter;
                  return (
                    <TouchableOpacity
                      key={ch}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => applyRef(libBook, ch)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0b0b10', // --bg
  },

  // top controls (sticky header)
  controls: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: '#0f1016', // .bible-controls bg
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#171923', // .bible-controls border
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  field: { width: 170 },
  fieldSmall: { width: 100 },
  label: {
    fontSize: 12,
    color: '#b8bcc7', // --ink-dim
    marginBottom: 6,
    fontWeight: '600',
  },
  selectLike: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232633',
    backgroundColor: '#14151b',
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232633',
    backgroundColor: '#14151b',
    color: '#f3f4f6', // --ink
  },

  heading: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '800',
    color: '#f3f4f6', // --ink
  },

  verseCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', // --card
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)', // --border
    marginBottom: 8,
  },
  verseCardHit: {
    backgroundColor: '#2a3a66', // similar to .bb-mark
    borderColor: 'transparent',
  },
  verseNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '800',
    color: '#b8bcc7', // dim ink
    backgroundColor: '#141826',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  verseNumHit: {
    backgroundColor: '#3b82f6', // --accent
    color: '#ffffff',
    borderColor: 'transparent',
  },
  verseText: {
    flex: 1,
    color: '#f3f4f6', // --ink
    lineHeight: 22,
    fontSize: 16,
  },
  verseTextHit: {
    fontWeight: '700',
  },

  loading: {
    padding: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dimText: {
    color: '#b8bcc7', // --ink-dim
    fontSize: 14,
  },
  errorBox: { paddingHorizontal: 14, paddingVertical: 10 },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },

  // ===== modal drawer styles =====
  drawerRoot: {
    flex: 1,
    backgroundColor: '#111217', // --panel
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#191e2b',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f3f4f6', // --ink
  },
  drawerClose: {
    color: '#3b82f6', // --accent
    fontWeight: '700',
  },
  drawerSearch: { padding: 12 },
  drawerSearchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23283a',
    paddingHorizontal: 12,
    backgroundColor: '#121522',
    color: '#f3f4f6', // --ink
  },
  drawerBody: { flex: 1, flexDirection: 'row' },

  booksPane: {
    width: 200,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#191e2b',
    backgroundColor: '#121522',
  },
  bookRow: { paddingVertical: 12, paddingHorizontal: 12 },
  bookRowActive: { backgroundColor: '#161a2a' },
  bookText: {
    fontSize: 14,
    color: '#f3f4f6', // --ink
  },
  bookTextActive: { fontWeight: '700' },

  chaptersPane: { flex: 1, padding: 12 },
  chaptersTitle: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 15,
    color: '#f3f4f6', // --ink
  },
  chaptersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#23283a',
    backgroundColor: '#121522',
  },
  chipActive: {
    backgroundColor: '#192035', // .lib-ch.active
  },
  chipText: {
    color: '#f3f4f6', // --ink
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#f3f4f6',
  },
});
import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { Ionicons } from '@expo/vector-icons';
import HeaderDropDown from '@/components/HeaderDropDown';
import { BOOKS, BOOK_ID_TO_NAME, BOOK_NAME_TO_ID } from '@/constants/bibleBooks';
import Colors from '@/constants/Colors';
import { addNote } from '@/utils/Database';
import { openBibleDb } from '@/utils/bibleDb';
import { bibleStorageBookId } from '@/utils/bibleBookIds';
import { completePlanDay, getSavedVerses, getStudySummary, READING_PLAN, savePosition, SavedVerse, toggleSavedVerse, verseDraft } from '@/utils/study';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scriptureFontFamily, spacing } from '@/constants/DesignTokens';

type VerseRow = { verse: number; text: string };
type SearchResult = { book_id: number; chapter: number; verse: number; text: string };

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
  const { ref: refParam, jump, planDay } = useLocalSearchParams<{ ref?: string; jump?: string; planDay?: string }>();
  const appDb = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedVerse[]>([]);
  const [actionVerse, setActionVerse] = useState<VerseRow | null>(null);
  const [notice, setNotice] = useState('');
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [retry, setRetry] = useState(0);
  const planIndex = planDay === undefined ? -1 : Number(planDay);
  const planEntry = Number.isInteger(planIndex) ? READING_PLAN[planIndex] : undefined;
  const pendingTarget = useRef<number | null>(null);
  const visibleMeta = useRef<{ book: string; chapter: number } | null>(null);
  const lastVisible = useRef('');
  const positionQueue = useRef(Promise.resolve());
  const persistPosition = (book: string, ch: number, verse: number) => {
    positionQueue.current = positionQueue.current.then(() => savePosition(appDb, { book, chapter: ch, verse }))
      .catch(() => setNotice('We couldn’t save your reading position. Tap a verse to try again.'));
  };
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { item: VerseRow }[] }) => {
    const meta = visibleMeta.current;
    if (!meta || !viewableItems.length) return;
    const target = pendingTarget.current;
    if (target && !viewableItems.some(v => v.item.verse === target)) return;
    const verse = target || viewableItems[0].item.verse;
    pendingTarget.current = null;
    const key = `${meta.book}-${meta.chapter}-${verse}`;
    if (lastVisible.current === key) return;
    lastVisible.current = key;
    persistPosition(meta.book, meta.chapter, verse);
  }).current;
  useFocusEffect(useCallback(() => {
    getSavedVerses(appDb).then(setSaved).catch(() => setNotice('We couldn’t load your saved verses. Reopen the Bible to try again.'));
    getStudySummary(appDb).then(s => setCompletedDays(s.plan.completed)).catch(() => setNotice('We couldn’t load your reading progress.'));
  }, [appDb]));
  async function saveMark(kind: SavedVerse['kind']) {
    if (!actionVerse) return;
    const item: SavedVerse = { book: bookName, chapter, ...actionVerse, kind };
    const remove = saved.some(s => s.book === bookName && s.chapter === chapter && s.verse === item.verse && s.kind === kind);
    try {
      await toggleSavedVerse(appDb, item, remove);
      setSaved(await getSavedVerses(appDb));
      setNotice(`${kind === 'bookmark' ? 'Bookmark' : 'Highlight'} ${remove ? 'removed' : 'saved'}.`);
      setActionVerse(null);
    } catch { setNotice('We couldn’t save that change. Please try again.'); }
  }

  // ===== Full Bible Search =====
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const runSearch = async (q: string) => {
    const term = q.trim();
    if (!term || !db) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      let results: SearchResult[] = [];
      try {
        results = await db.getAllAsync<SearchResult>(
          'SELECT b.book_reference_id AS book_id,v.chapter,v.verse,v.text FROM verse v JOIN book b ON b.id=v.book_id WHERE b.id<=66 AND v.text LIKE ? LIMIT 100',
          [`%${term}%`]
        );
      } catch {
        results = await db.getAllAsync<SearchResult>(
          'SELECT b.book_reference_id AS book_id,v.chapter,v.verse,v.text FROM verses v JOIN book b ON b.id=v.book_id WHERE b.id<=66 AND v.text LIKE ? LIMIT 100',
          [`%${term}%`]
        );
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => runSearch(text), 300);
  };

  const onSelectSearchResult = (result: SearchResult) => {
    const name = BOOK_ID_TO_NAME[result.book_id];
    if (name) {
      setBookName(name);
      setChapter(result.chapter);
      setChapterInput(String(result.chapter));
      setHighlightVerse(result.verse);
      pendingTarget.current = result.verse;
      setQuery('');
    }
    closeSearch();
  };

  const handleCopyVerse = async (verseNum: number, text: string) => {
    const formatted = `${bookName} ${chapter}:${verseNum} — "${text}"`;
    await Clipboard.setStringAsync(formatted);
    Alert.alert('Copied', 'Verse copied.');
  };

  const handleSaveVerse = async (verseNum: number, text: string) => {
    const reference = `${bookName} ${chapter}:${verseNum}`;
    try {
      await addNote(appDb, text, 'bible', reference);
      setNotice('Verse saved to your notes.');
      Alert.alert('Saved', 'Verse saved to your notes.');
    } catch {
      Alert.alert('Couldn’t save note', 'Please try again.');
    }
  };

  const onVerseLongPress = (verseNum: number, text: string) => {
    persistPosition(bookName, chapter, verseNum);
    setActionVerse({ verse: verseNum, text });
  };

  // DB + loading
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [error, setError] = useState<string>('');

  // Current reference
  const [bookName, setBookName] = useState<string>('Genesis');
  const [chapter, setChapter] = useState<number>(1);
  const [chapterInput, setChapterInput] = useState<string>('1'); // 🔹 input text for chapter
  const activePlan = planEntry && refParam === planEntry.reference && parseSimpleRef(planEntry.reference).book === bookName && parseSimpleRef(planEntry.reference).chapter === chapter;

  // Highlighted verse (when navigated via ?ref=)
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null);

  // In-chapter search
  const [query, setQuery] = useState<string>('');

  // Verses
  const [rows, setRows] = useState<VerseRow[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  // flatlist ref to scroll to verse
  const listRef = useRef<FlatList<VerseRow>>(null);
  const headerHeight = useRef(0);

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
    visibleMeta.current = null;
    pendingTarget.current = null;
    setHighlightVerse(null);
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
        setError(e?.message || 'We couldn’t open the Bible. Please try again.');
      } finally {
        setLoadingDb(false);
      }
    })();
  }, [retry]);

  useEffect(() => {
    let cancelled = false;
    getStudySummary(appDb).then(({ position }) => {
      if (cancelled) return;
      const parsed = parseSimpleRef(refParam);
      const p = parsed.book && parsed.chapter
        ? { book: parsed.book, chapter: parsed.chapter, verse: parsed.verse || 1 }
        : position;
      if (p) {
        setBookName(p.book); setChapter(p.chapter); setChapterInput(String(p.chapter));
        setHighlightVerse(p.verse); pendingTarget.current = p.verse;
      }
      setReady(true);
    }).catch(() => setError('We couldn’t restore your reading position. Reopen the Bible to try again.'));
    return () => { cancelled = true; };
    // Only hydrate once. Explicit navigation is handled below after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appDb]);

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
    if (!ready) return;
    const { book, chapter: ch, verse } = parseSimpleRef(refParam);
    if (book && ch) {
      visibleMeta.current = null;
      setQuery('');
      setBookName(book);
      setChapter(ch);
      setChapterInput(String(ch)); // 🔹 sync input with deep link
      setHighlightVerse(Number.isFinite(verse as number) ? (verse as number) : null);
      pendingTarget.current = verse || 1;
    }
  }, [refParam, jump, ready]);

  // Load verses on ref change
  useEffect(() => {
    if (!db || !ready) return;
    let cancelled = false;
    visibleMeta.current = null;
    (async () => {
      try {
        setLoadingVerses(true);
        const bookId = await bibleStorageBookId(db, BOOK_NAME_TO_ID[bookName]);
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
        if (cancelled) return;
        setRows(out);
        visibleMeta.current = { book: bookName, chapter };
        persistPosition(bookName, chapter, pendingTarget.current || 1);
        setError('');
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setRows([]);
        setError(e?.message || 'We couldn’t load these verses. Please try again.');
      } finally {
        if (!cancelled) setLoadingVerses(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ready, bookName, chapter, refParam, jump]);

  // After verses load, scroll to the highlighted verse (if any)
  useEffect(() => {
    if (!highlightVerse || rows.length === 0) return;
    const index = rows.findIndex((r) => r.verse === highlightVerse);
    if (index >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0, viewOffset: headerHeight.current + 8 });
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
      <View style={styles.pageIntro}>
        <Text style={{ color: Colors.textMuted }}>King James Version · Bible text · available offline on this device</Text>
        <Text style={{ color: Colors.textMuted }}>Tap a verse to bookmark it, highlight it, save a note, open Authors insight, or start a chat.</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open Authors insight for ${bookName} ${chapter}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 44, paddingVertical: 12 }}
          onPress={() => router.push({ pathname: '/(auth)/(drawer)/library', params: {
            book: String(BOOK_NAME_TO_ID[bookName]), chapter: String(chapter), jump: String(Date.now()),
          } })}>
          <Ionicons name="library-outline" size={19} color={Colors.coral} />
          <Text style={{ color: Colors.coral, fontWeight: '700' }}>Authors insight</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.coral} />
        </TouchableOpacity>
        {!!notice && <Text accessibilityLiveRegion="polite" style={{ color: Colors.coralSoft }}>{notice}</Text>}
        {activePlan && <TouchableOpacity style={{ paddingVertical: 12 }} disabled={completedDays.includes(planIndex)}
          onPress={async () => {
            try { await completePlanDay(appDb, planIndex); setCompletedDays([...completedDays, planIndex]); setNotice('Plan reading completed. Return to Today for the next day.'); }
            catch { setNotice('We couldn’t mark this reading as complete. Please try again.'); }
          }}>
          <Text style={{ color: Colors.coralSoft, fontWeight: '700' }}>{completedDays.includes(planIndex) ? 'Reading completed' : `Mark day ${planIndex + 1} complete · ${planEntry?.reference}`}</Text>
        </TouchableOpacity>}
      </View>
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderDropDown title="Bible" />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.header_bg },
          headerTintColor: Colors.header_txt,
          headerRight: () => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Search all Bible verses"
              onPress={openSearch}
              style={{ width: 44, height: 44, marginRight: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="search-outline" size={22} color={Colors.header_txt} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Main list with a sticky header for controls */}
      <FlatList
        ref={listRef}
        data={filtered}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50, minimumViewTime: 250 }}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          listRef.current?.scrollToOffset({ offset: Math.max(0, averageItemLength * index), animated: false });
          setTimeout(() => {
            if (index < rows.length) listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0, viewOffset: headerHeight.current + 8 });
          }, 150);
        }}
        keyExtractor={(item) => String(item.verse)}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg + insets.bottom }]}
        ListHeaderComponent={
          <View style={{ backgroundColor: Colors.surfaceSubtle }} onLayout={event => { headerHeight.current = event.nativeEvent.layout.height; }}>
            {/* Controls */}
            <View style={styles.controls}>
              {/* Book (opens searchable picker) */}
              <View style={styles.field}>
                <Text style={styles.label}>Book</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Choose Bible book. Current book: ${bookName}`}
                  onPress={openLibrary}
                >
                  <View pointerEvents="none" style={styles.selectLike}>
                    <TextInput value={bookName} editable={false} style={styles.input} />
                  </View>
                </Pressable>
              </View>

              {/* Chapter (editable by number, now behaves properly) */}
              <View style={styles.fieldSmall}>
                <Text style={styles.label}>Chapter</Text>
                <TextInput
                  accessibilityLabel="Chapter number"
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
                      visibleMeta.current = null;
                      pendingTarget.current = null;
                      setHighlightVerse(null);
                      setChapter(clamped);
                    }
                  }}
                  style={styles.input}
                />
              </View>

              {/* In-chapter search */}
              <View style={styles.chapterSearch}>
                <Text style={styles.label}>Find in chapter</Text>
                <TextInput
                  accessibilityLabel="Find words in this chapter"
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
          </View>
        }
        renderItem={({ item }) => {
          const isHit = item.verse === highlightVerse;
          return (
            <Pressable
              style={{ paddingHorizontal: 14 }}
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${bookName} ${chapter}:${item.verse}`}
              onPress={() => onVerseLongPress(item.verse, item.text)}
              onLongPress={() => onVerseLongPress(item.verse, item.text)}
            >
              <View style={[styles.verseCard, saved.some(s => s.book === bookName && s.chapter === chapter && s.verse === item.verse && s.kind === 'highlight') && { backgroundColor: '#3a3018' }, isHit && styles.verseCardHit]}>
                <Text style={[styles.verseNum, isHit && styles.verseNumHit]}>{item.verse}</Text>
                <Text style={[styles.verseText, isHit && styles.verseTextHit]}>{item.text}</Text>
                {saved.some(s => s.book === bookName && s.chapter === chapter && s.verse === item.verse && s.kind === 'bookmark') && <Ionicons name="bookmark" size={18} color={Colors.coral} />}
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          loadingDb || loadingVerses ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.dimText}>Loading the Bible…</Text>
            </View>
          ) : null
        }
      />
      <Modal visible={!!actionVerse} transparent animationType="fade" onRequestClose={() => setActionVerse(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.coralTint, borderRadius: 18, padding: 20 }}>
            <Text style={{ color: Colors.coral, fontSize: 18, fontWeight: '700' }}>{bookName} {chapter}:{actionVerse?.verse} · KJV</Text>
            {(['bookmark', 'highlight'] as const).map(kind => {
              const exists = saved.some(s => s.book === bookName && s.chapter === chapter && s.verse === actionVerse?.verse && s.kind === kind);
              return <TouchableOpacity key={kind} onPress={() => saveMark(kind)} style={styles.actionItem}><Text style={{ color: Colors.text }}>{exists ? 'Remove' : 'Add'} {kind}</Text></TouchableOpacity>;
            })}
            <TouchableOpacity accessibilityRole="button" style={styles.actionItem} onPress={() => {
              if (!actionVerse) return;
              const verse = actionVerse.verse;
              setActionVerse(null);
              router.push({ pathname: '/(auth)/(drawer)/library', params: {
                book: String(BOOK_NAME_TO_ID[bookName]), chapter: String(chapter), verse: String(verse),
                jump: String(Date.now()),
              } });
            }}><Text style={{ color: Colors.coral }}>Authors insight · this verse</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => {
              if (!actionVerse) return;
              const draft = verseDraft(`${bookName} ${chapter}:${actionVerse.verse}`, actionVerse.text);
              setActionVerse(null);
              router.push({ pathname: '/(auth)/(drawer)/(chat)/new', params: { draft, draftId: String(Date.now()) } });
            }}><Text style={{ color: Colors.coralSoft }}>Ask GospelAI · edit draft first</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={async () => {
              if (!actionVerse) return;
              try { await handleCopyVerse(actionVerse.verse, actionVerse.text); setNotice('Verse copied.'); setActionVerse(null); }
              catch { setNotice('We couldn’t copy the verse. Please try again.'); }
            }}><Text style={{ color: Colors.text }}>Copy verse</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={async () => { if (actionVerse) await handleSaveVerse(actionVerse.verse, actionVerse.text); setActionVerse(null); }}><Text style={{ color: Colors.text }}>Save to notes</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => setActionVerse(null)}><Text style={{ color: Colors.textMuted }}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Non-blocking error box */}
      {!!error && !loadingDb && !loadingVerses && (
        <View style={styles.errorBox}>
          <Text style={styles.dimText}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Try loading the Bible again" onPress={() => setRetry(r => r + 1)}><Text style={{ color: Colors.coralSoft, padding: 12 }}>Try again</Text></TouchableOpacity>
        </View>
      )}

      {/* ===== Full Bible Search modal ===== */}
      <Modal
        visible={searchOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSearch}
      >
        <View style={styles.drawerRoot}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Search the Bible</Text>
            <TouchableOpacity onPress={closeSearch}>
              <Text style={styles.drawerClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.drawerSearch}>
            <TextInput
              placeholder="Search all verses (for example, love one another)…"
              accessibilityLabel="Search all Bible verses"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
              style={styles.drawerSearchInput}
              placeholderTextColor={Colors.textMuted}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>

          {searchLoading ? (
            <View style={styles.searchCenter}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.searchDim}>Searching…</Text>
            </View>
          ) : searchQuery.trim().length > 0 && searchResults.length === 0 ? (
            <View style={styles.searchCenter}>
              <Ionicons name="search-outline" size={36} color="#3a3d4a" />
              <Text style={styles.searchDim}>No results found</Text>
            </View>
          ) : searchQuery.trim().length === 0 ? (
            <View style={styles.searchCenter}>
              <Ionicons name="book-outline" size={36} color="#3a3d4a" />
              <Text style={styles.searchDim}>Type a word or phrase to search all 31,000+ KJV verses</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item, idx) => `${item.book_id}-${item.chapter}-${item.verse}-${idx}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 30 }}
              renderItem={({ item }) => {
                const bookName = BOOK_ID_TO_NAME[item.book_id] || `Book ${item.book_id}`;
                const ref = `${bookName} ${item.chapter}:${item.verse}`;
                return (
                  <Pressable onPress={() => onSelectSearchResult(item)} style={styles.searchRow}>
                    <View style={styles.searchRefPill}>
                      <Text style={styles.searchRefText}>{ref}</Text>
                    </View>
                    <Text style={styles.searchVerseText} numberOfLines={3}>{item.text}</Text>
                  </Pressable>
                );
              }}
              ListHeaderComponent={
                <Text style={styles.searchCount}>
                  {searchResults.length === 100
                    ? 'Top 100 results'
                    : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
                </Text>
              }
            />
          )}
        </View>
      </Modal>

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
              placeholderTextColor={Colors.textMuted}
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
    backgroundColor: Colors.background,
  },
  pageIntro: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },

  // top controls (sticky header)
  controls: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  field: { flex: 1, minWidth: 140 },
  fieldSmall: { width: 84 },
  chapterSearch: { width: '100%' },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  selectLike: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
    color: Colors.text,
  },

  heading: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },

  verseCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  verseCardHit: {
    backgroundColor: Colors.plum,
    borderColor: Colors.borderStrong,
  },
  verseNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '800',
    color: Colors.textMuted,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  verseNumHit: {
    backgroundColor: Colors.coral,
    color: Colors.onCoral,
    borderColor: 'transparent',
  },
  verseText: {
    flex: 1,
    color: Colors.scripture,
    lineHeight: 22,
    fontSize: 16,
    fontFamily: scriptureFontFamily,
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
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorBox: { paddingHorizontal: 14, paddingVertical: 10 },
  actionItem: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },

  // ===== modal drawer styles =====
  drawerRoot: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  drawerClose: {
    minHeight: 44,
    minWidth: 44,
    textAlignVertical: 'center',
    color: Colors.coral,
    fontWeight: '700',
  },
  drawerSearch: { padding: 12 },
  drawerSearchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceRaised,
    color: Colors.text,
  },
  drawerBody: { flex: 1, flexDirection: 'row' },

  booksPane: {
    width: 200,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  bookRow: { paddingVertical: 12, paddingHorizontal: 12 },
  bookRowActive: { backgroundColor: Colors.plum },
  bookText: {
    fontSize: 14,
    color: Colors.text,
  },
  bookTextActive: { fontWeight: '700' },

  chaptersPane: { flex: 1, padding: 12 },
  chaptersTitle: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 15,
    color: Colors.text,
  },
  chaptersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  chipActive: {
    backgroundColor: Colors.plum,
  },
  chipText: {
    color: Colors.text,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.text,
  },

  searchCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  searchDim: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  searchCount: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    color: '#8a90a2',
    fontWeight: '600',
  },
  searchRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  searchRefPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(143,215,229,0.13)',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  searchRefText: {
    color: Colors.coralSoft,
    fontWeight: '700',
    fontSize: 12,
  },
  searchVerseText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
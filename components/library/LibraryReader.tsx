import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type ViewToken } from 'react-native';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { addNote } from '@/utils/Database';
import { getLibraryPosition, readSection, saveLibraryPosition, sectionsForWork } from '@/utils/library';
import type { LibraryWork, SectionSummary } from '@/utils/libraryTypes';

type ParagraphRow = { paragraph: number; text: string };
type ReaderContent = { title: string; source_url: string; attribution: string; paragraphs: ParagraphRow[] };
const C = { paper: '#0A0A0A', panel: '#121318', ink: '#F5F1E8', muted: '#9B9AA2', gold: '#D4B65F', line: '#292A30', green: '#80C59A' };

function clampParagraph(value: number | undefined, count: number) {
  if (value === undefined || !Number.isFinite(value)) return 0;
  const integer = Math.floor(value);
  return Math.max(0, Math.min(integer, Math.max(0, count - 1)));
}

export default function LibraryReader({
  appDb, work, initialSection, initialParagraph, onClose, onPersistError,
}: {
  appDb: SQLiteDatabase; work: LibraryWork; initialSection?: string; initialParagraph?: number;
  onClose: () => void; onPersistError: (message: string | null) => void;
}) {
  const db = useSQLiteContext();
  const list = useRef<FlatList<ParagraphRow>>(null);
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [content, setContent] = useState<ReaderContent | null>(null);
  const [visibleParagraph, setVisibleParagraph] = useState(0);
  const [targetParagraph, setTargetParagraph] = useState<number | null>(initialParagraph ?? null);
  const [tocQuery, setTocQuery] = useState('');
  const [tocVisible, setTocVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [retryScroll, setRetryScroll] = useState(0);
  const visibleParagraphRef = useRef(visibleParagraph);
  visibleParagraphRef.current = visibleParagraph;
  const loadRequestRef = useRef(0);
  const activeSectionRef = useRef<string | null>(null);
  const requestedSectionRef = useRef<string | undefined>(initialSection);
  const requestedParagraphRef = useRef<number | undefined>(initialParagraph);
  const pendingTargetRef = useRef<{ sectionId: string; paragraph: number } | null>(null);
  const failedPositionRef = useRef<{ sectionId: string; paragraph: number } | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const current = sections[sectionIndex];
  const filteredSections = useMemo(() => {
    const term = tocQuery.trim().toLocaleLowerCase();
    return term ? sections.filter(s => s.title.toLocaleLowerCase().includes(term)) : sections;
  }, [sections, tocQuery]);

  const queuePositionSave = useCallback((sectionId: string, paragraph: number) => {
    const save = saveQueueRef.current.catch(() => undefined).then(
      () => saveLibraryPosition(db, work.id, sectionId, paragraph),
    );
    saveQueueRef.current = save.then(() => undefined, () => undefined);
    return save;
  }, [db, work.id]);

  const persistPosition = useCallback(async (sectionId: string, paragraph: number) => {
    if (activeSectionRef.current !== sectionId) return;
    const target = { sectionId, paragraph };
    failedPositionRef.current = target;
    try {
      await queuePositionSave(sectionId, paragraph);
      if (!mountedRef.current || activeSectionRef.current !== sectionId) return;
      if (failedPositionRef.current?.sectionId === sectionId && failedPositionRef.current.paragraph === paragraph) {
        failedPositionRef.current = null;
        setPositionError(null);
        onPersistError(null);
      }
    } catch (e) {
      if (!mountedRef.current || activeSectionRef.current !== sectionId ||
        failedPositionRef.current?.sectionId !== target.sectionId ||
        failedPositionRef.current.paragraph !== target.paragraph) return;
      const message = e instanceof Error ? e.message : 'We couldn’t save your reading position.';
      setPositionError(message);
      onPersistError(message);
    }
  }, [onPersistError, queuePositionSave]);

  const load = useCallback(async (sectionId?: string, paragraph?: number) => {
    const request = ++loadRequestRef.current;
    requestedSectionRef.current = sectionId;
    requestedParagraphRef.current = paragraph;
    activeSectionRef.current = null;
    pendingTargetRef.current = null;
    setLoading(true); setError(null); setContent(null);
    try {
      const all = await sectionsForWork(db, work.id);
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      setSections(all);
      let index = -1;
      if (sectionId !== undefined) {
        index = all.findIndex(s => s.id === sectionId);
        if (index < 0) throw new Error('This section isn’t in the downloaded work. Return to the work details and try downloading it again.');
      } else {
        const position = await getLibraryPosition(db, work.id);
        if (!mountedRef.current || request !== loadRequestRef.current) return;
        index = position ? all.findIndex(s => s.id === position.section_id) : -1;
        if (index >= 0 && paragraph === undefined) paragraph = position!.paragraph;
      }
      if (index < 0) index = 0;
      if (!all[index]) throw new Error('This work has no readable sections. Return to the library and try downloading it again.');
      const result = await readSection(db, work.id, all[index].id);
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      const resolvedParagraph = clampParagraph(paragraph, result.paragraphs.length);
      activeSectionRef.current = all[index].id;
      pendingTargetRef.current = { sectionId: all[index].id, paragraph: resolvedParagraph };
      requestedSectionRef.current = all[index].id;
      requestedParagraphRef.current = resolvedParagraph;
      visibleParagraphRef.current = resolvedParagraph;
      setSectionIndex(index);
      setContent(result);
      setVisibleParagraph(resolvedParagraph);
      setTargetParagraph(resolvedParagraph);
      setRetryScroll(v => v + 1);
      await persistPosition(all[index].id, resolvedParagraph);
    } catch (e) {
      if (mountedRef.current && request === loadRequestRef.current) {
        setError(e instanceof Error ? e.message : 'We couldn’t open this section. Please try again.');
      }
    } finally {
      if (mountedRef.current && request === loadRequestRef.current) setLoading(false);
    }
  }, [db, persistPosition, work.id]);

  useEffect(() => { void load(initialSection, initialParagraph); }, [load, initialSection, initialParagraph]);

  useEffect(() => {
    if (targetParagraph === null || !content?.paragraphs.length || loading) return;
    const target = Math.max(0, Math.min(targetParagraph, content.paragraphs.length - 1));
    const timer = setTimeout(() => {
      try { list.current?.scrollToIndex({ index: target, animated: false, viewPosition: 0.12 }); }
      catch { setRetryScroll(v => v + 1); }
    }, retryScroll ? 40 : 180);
    return () => clearTimeout(timer);
  }, [targetParagraph, content, loading, retryScroll]);

  const changeSection = (index: number) => {
    const next = sections[index];
    if (!next) return;
    setTocVisible(false);
    void load(next.id, 0);
  };

  const persistPositionRef = useRef(persistPosition);
  persistPositionRef.current = persistPosition;
  const viewabilityHandler = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems.find(item => item.isViewable)?.index;
    const sectionId = activeSectionRef.current;
    if (visible === null || visible === undefined || !sectionId) return;
    const pending = pendingTargetRef.current;
    if (pending?.sectionId === sectionId && pending.paragraph !== visible) return;
    if (pending?.sectionId === sectionId) {
      pendingTargetRef.current = null;
      setTargetParagraph(null);
    }
    if (visible !== visibleParagraphRef.current) {
      visibleParagraphRef.current = visible;
      setVisibleParagraph(visible);
      void persistPositionRef.current(sectionId, visible);
    }
  });

  const saveSelectedNote = async () => {
    if (!content || !current || visibleParagraph < 0) return;
    const text = content.paragraphs[visibleParagraph]?.text;
    if (!text) return;
    try {
      await addNote(appDb, text, 'library', `${work.author} · ${work.title} · ${current.title} · paragraph ${visibleParagraph + 1}`);
      setNoteStatus('Paragraph saved to your notes on this device.');
    } catch (e) {
      setNoteStatus(e instanceof Error ? e.message : 'We couldn’t save that paragraph as a note. Please try again.');
    }
  };

  const move = (delta: number) => {
    const nextIndex = sectionIndex + delta;
    if (nextIndex >= 0 && nextIndex < sections.length) changeSection(nextIndex);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.readerHeader}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back to work details" style={styles.back}><Ionicons name="arrow-back" size={19} color={C.ink} /></Pressable>
        <View style={styles.headerText}><Text style={styles.eyebrow}>HISTORICAL SOURCE TEXT</Text><Text style={styles.headerTitle} numberOfLines={1}>{work.title}</Text></View>
        <Pressable onPress={() => setTocVisible(!tocVisible)} accessibilityRole="button" accessibilityLabel="Open table of contents" style={styles.tocButton}><Ionicons name="list-outline" size={20} color={C.gold} /></Pressable>
      </View>
      {tocVisible ? (
        <View style={styles.tocPanel}>
          <TextInput value={tocQuery} onChangeText={setTocQuery} placeholder="Search chapters or dates" placeholderTextColor="#777780" style={styles.tocInput} accessibilityLabel="Search table of contents" />
          <FlatList data={filteredSections} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" style={styles.tocList}
            renderItem={({ item }) => <Pressable onPress={() => changeSection(sections.findIndex(s => s.id === item.id))} style={styles.tocRow}><Text style={styles.tocText}>{item.title}</Text><Ionicons name="chevron-forward" size={15} color={C.muted} /></Pressable>}
            ListEmptyComponent={<Text style={styles.emptyToc}>No chapters or dates match that search.</Text>} />
        </View>
      ) : null}
      {error ? <View style={styles.readerError}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load(requestedSectionRef.current, requestedParagraphRef.current)} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
      {loading ? <View style={styles.loading}><View style={styles.skeleton} /><View style={styles.skeletonShort} /><View style={styles.skeleton} /></View> : content ? (
        <>
          <View style={styles.sectionBar}><Text style={styles.sectionTitle} numberOfLines={2}>{content.title}</Text><Text style={styles.attribution}>{content.attribution}</Text></View>
          <FlatList
            ref={list}
            data={content.paragraphs}
            keyExtractor={item => `${current?.id}-${item.paragraph}`}
            contentContainerStyle={styles.paragraphList}
            onViewableItemsChanged={viewabilityHandler.current}
            viewabilityConfig={{ itemVisiblePercentThreshold: 35 }}
            onScrollToIndexFailed={({ index }) => {
              list.current?.scrollToOffset({ offset: Math.max(0, index * 150), animated: false });
              setTimeout(() => list.current?.scrollToIndex({ index, animated: false }), 120);
            }}
            renderItem={({ item, index }) => (
              <Pressable onLongPress={() => {
                if (!current) return;
                visibleParagraphRef.current = index;
                setVisibleParagraph(index);
                void persistPosition(current.id, index);
                setNoteStatus(null);
              }} style={[styles.paragraph, index === visibleParagraph && styles.activeParagraph]}>
                <Text style={styles.paragraphNo}>{String(index + 1).padStart(2, '0')}</Text>
                <Text selectable style={styles.paragraphText}>{item.text}</Text>
              </Pressable>
            )}
          />
          <View style={styles.readerFooter}>
            <View style={styles.footerActions}>
              <Pressable accessibilityRole="button" disabled={sectionIndex === 0} onPress={() => move(-1)} style={styles.footerButton}><Ionicons name="chevron-back" size={16} color={sectionIndex === 0 ? '#55565C' : C.ink} /><Text style={styles.footerText}>Previous</Text></Pressable>
              <Text style={styles.footerCount}>{sectionIndex + 1} / {sections.length}</Text>
              <Pressable accessibilityRole="button" disabled={sectionIndex >= sections.length - 1} onPress={() => move(1)} style={styles.footerButton}><Text style={styles.footerText}>Next</Text><Ionicons name="chevron-forward" size={16} color={sectionIndex >= sections.length - 1 ? '#55565C' : C.ink} /></Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={saveSelectedNote} style={styles.noteButton}><Ionicons name="bookmark-outline" size={15} color={C.gold} /><Text style={styles.noteText}>Save selected paragraph to Notes</Text></Pressable>
            {noteStatus ? <Text accessibilityRole="alert" style={styles.noteStatus}>{noteStatus}</Text> : null}
            {positionError ? <Pressable accessibilityRole="button" onPress={() => {
              const failed = failedPositionRef.current;
              if (failed) void persistPosition(failed.sectionId, failed.paragraph);
            }} style={styles.positionRetry}><Text style={styles.positionError}>{positionError} · Retry</Text></Pressable> : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  readerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  back: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel },
  headerText: { flex: 1 }, eyebrow: { color: C.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  headerTitle: { color: C.ink, fontWeight: '700', fontSize: 14, marginTop: 3 },
  tocButton: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211F1A' },
  tocPanel: { backgroundColor: C.panel, margin: 12, maxHeight: '48%', borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 10 },
  tocInput: { color: C.ink, minHeight: 42, borderRadius: 10, backgroundColor: '#1A1B20', paddingHorizontal: 12, marginBottom: 5 },
  tocList: { flexGrow: 0 }, tocRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, paddingHorizontal: 5 },
  tocText: { color: C.ink, flex: 1, fontSize: 13 }, emptyToc: { color: C.muted, padding: 12 },
  sectionBar: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12 }, sectionTitle: { color: C.ink, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  attribution: { color: '#A3A09A', fontSize: 11, lineHeight: 16, marginTop: 7 },
  paragraphList: { paddingHorizontal: 18, paddingBottom: 14 }, paragraph: { flexDirection: 'row', gap: 12, paddingVertical: 15, paddingHorizontal: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#24252A' },
  activeParagraph: { backgroundColor: '#121914', borderRadius: 10 }, paragraphNo: { width: 22, color: '#8F8056', fontSize: 10, fontWeight: '800', paddingTop: 3 },
  paragraphText: { flex: 1, color: '#D6D1C7', fontSize: 16, lineHeight: 27, fontFamily: 'Georgia' },
  readerFooter: { borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 16, paddingTop: 9, paddingBottom: 12, backgroundColor: '#0D0E11' },
  footerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, footerButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5 },
  footerText: { color: C.ink, fontSize: 12, fontWeight: '600' }, footerCount: { color: C.muted, fontSize: 11, fontWeight: '700' },
  noteButton: { alignSelf: 'center', minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 }, noteText: { color: C.gold, fontSize: 11, fontWeight: '700' },
  noteStatus: { color: C.muted, textAlign: 'center', fontSize: 10, paddingBottom: 3 },
  positionRetry: { paddingVertical: 5 }, positionError: { color: '#E0B9B1', fontSize: 10, textAlign: 'center', textDecorationLine: 'underline' },
  loading: { padding: 22, gap: 14 }, skeleton: { height: 18, borderRadius: 7, width: '95%', backgroundColor: '#24252B' }, skeletonShort: { height: 18, borderRadius: 7, width: '67%', backgroundColor: '#202127' },
  readerError: { margin: 18, padding: 15, borderRadius: 14, backgroundColor: '#251818', borderWidth: 1, borderColor: '#54332E' }, errorText: { color: '#E0B9B1', fontSize: 13, lineHeight: 19 }, retry: { paddingTop: 10 }, retryText: { color: C.gold, fontWeight: '700' },
});

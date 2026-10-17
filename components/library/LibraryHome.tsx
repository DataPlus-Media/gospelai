import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Linking, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LIBRARY_AUTHORS, LIBRARY_WORKS } from '@/constants/libraryWorks';
import { getLibraryPosition, installedWorks, removeWork, searchLibrary, workNotices, workAvailability } from '@/utils/library';
import type { InstalledWork, LibraryHit, LibraryWork } from '@/utils/libraryTypes';
import LibraryReader from '@/components/library/LibraryReader';
import LibraryWorkCard from '@/components/library/LibraryWorkCard';
import { downloadWork } from '@/utils/libraryDownload';
import PassageInsight from '@/components/library/PassageInsight';

const C = { ink: '#F5F1E8', muted: '#9B9AA2', gold: '#D4B65F', green: '#80C59A', panel: '#121318', line: '#292A30' };
type DownloadProgress = { phase: 'downloading' | 'installing'; fraction: number | null; received: number; total: number };
type LibraryListItem = { type: 'hit'; hit: LibraryHit } | { type: 'work'; work: LibraryWork };

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function LibraryHome({
  appDb, params, setParams,
}: {
  appDb: SQLiteDatabase;
  params: { work?: string; section?: string; paragraph?: string; book?: string; chapter?: string; verse?: string; jump?: string };
  setParams: (params: Record<string, string | undefined>) => void;
}) {
  const db = useSQLiteContext();
  const [author, setAuthor] = useState<string>('All authors');
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [installed, setInstalled] = useState<InstalledWork[]>([]);
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof workAvailability>>>([]);
  const [hits, setHits] = useState<LibraryHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [detailNotices, setDetailNotices] = useState<string[]>([]);
  const [detailPosition, setDetailPosition] = useState<{ section_id: string; paragraph: number } | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [workError, setWorkError] = useState<string | null>(null);
  const [removeVisible, setRemoveVisible] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const detailRequestRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const selectedWork = params.work ? LIBRARY_WORKS.find(w => w.id === params.work) ?? null : null;
  const isReading = !!(params.section && selectedWork);
  const selectedTitle = selectedTitleId ? LIBRARY_WORKS.find(work => work.id === selectedTitleId) ?? null : null;
  const installedIds = useMemo(() => new Set(installed.map(row => row.work_id)), [installed]);
  const authorWorks = useMemo(
    () => LIBRARY_WORKS.filter(work => author === 'All authors' || work.author === author),
    [author],
  );
  const visibleWorks = useMemo(
    () => authorWorks.filter(work => !selectedTitleId || work.id === selectedTitleId),
    [authorWorks, selectedTitleId],
  );
  const listItems = useMemo<LibraryListItem[]>(
    () => query.trim()
      ? hits.map<LibraryListItem>(hit => ({ type: 'hit', hit }))
      : visibleWorks.map<LibraryListItem>(work => ({ type: 'work', work })),
    [query, hits, visibleWorks],
  );

  const selectAuthor = (name: string) => {
    setAuthor(name);
    if (selectedTitle && name !== 'All authors' && selectedTitle.author !== name) {
      setSelectedTitleId(null);
    }
  };

  const refreshInstalled = useCallback(async () => {
    try {
      const [result, status] = await Promise.all([installedWorks(db), workAvailability(db, LIBRARY_WORKS)]);
      if (mountedRef.current) {
        setInstalled(result.filter(row => status.some(item => item.work_id === row.work_id && item.state === 'ready')));
        setAvailability(status); setPageError(null);
      }
    } catch (e) {
      if (mountedRef.current) setPageError(e instanceof Error ? e.message : 'Downloaded books could not be loaded. Please retry.');
    }
  }, [db]);
  useFocusEffect(useCallback(() => { void refreshInstalled(); }, [refreshInstalled]));

  const openDetail = useCallback(async (work: LibraryWork) => {
    const request = ++detailRequestRef.current;
    setWorkError(null); setDetailNotices([]); setDetailPosition(null);
    if (work.blocker) return;
    try {
      const [notices, position] = await Promise.all([workNotices(db, work.id), getLibraryPosition(db, work.id)]);
      if (mountedRef.current && request === detailRequestRef.current) { setDetailNotices(notices); setDetailPosition(position); }
    } catch (e) {
      if (mountedRef.current && request === detailRequestRef.current) setWorkError(e instanceof Error ? e.message : 'Work details could not be loaded. Please retry.');
    }
  }, [db]);
  useEffect(() => {
    if (selectedWork && !isReading) { void openDetail(selectedWork); void refreshInstalled(); }
  }, [selectedWork, isReading, openDetail, refreshInstalled]);

  // A monotonically increasing request token prevents an older search from replacing a newer query.
  const searchToken = React.useRef(0);
  useEffect(() => {
    const token = ++searchToken.current;
    let active = true;
    if (!query.trim()) {
      setHits([]);
      setLoading(false);
    } else {
      setHits([]);
      setLoading(true);
    }
    const run = async () => {
      const term = query.trim();
      if (!term) return;
      const ids = LIBRARY_WORKS
        .filter(work => installedIds.has(work.id) &&
          (author === 'All authors' || work.author === author) &&
          (!selectedTitleId || work.id === selectedTitleId))
        .map(work => work.id);
      setLoading(true); setPageError(null);
      try {
        const result = await searchLibrary(db, term, ids);
        if (active && token === searchToken.current) setHits(result);
      } catch (e) {
        if (active && token === searchToken.current) setPageError(e instanceof Error ? e.message : 'Library search failed. Please retry.');
      } finally { if (active && token === searchToken.current) setLoading(false); }
    };
    const timer = setTimeout(() => { void run(); }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [db, query, author, selectedTitleId, installedIds]);

  const beginDownload = async (work: LibraryWork) => {
    setDownloadBusy(true); setWorkError(null); setDownloadProgress({ phase: 'downloading', fraction: 0, received: 0, total: work.package?.bytes ?? 0 });
    try {
      await downloadWork(db, work, (progress: DownloadProgress) => {
        if (mountedRef.current) setDownloadProgress(progress);
      });
      if (!mountedRef.current) return;
      await refreshInstalled();
      const [notices, position] = await Promise.all([workNotices(db, work.id), getLibraryPosition(db, work.id)]);
      if (mountedRef.current) { setDetailNotices(notices); setDetailPosition(position); }
      if (mountedRef.current && params.book && params.chapter) {
        setParams({ work: undefined, section: undefined, paragraph: undefined });
      }
    } catch (e) {
      if (mountedRef.current) setWorkError(e instanceof Error ? e.message : 'The download could not be completed. Please retry.');
    } finally {
      if (mountedRef.current) { setDownloadBusy(false); setDownloadProgress(null); }
    }
  };

  const confirmRemove = async () => {
    if (!selectedWork) return;
    setDownloadBusy(true); setWorkError(null);
    try {
      await removeWork(db, selectedWork.id);
      if (!mountedRef.current) return;
      setRemoveVisible(false); await refreshInstalled(); setDetailNotices([]); setDetailPosition(null);
    } catch (e) {
      if (mountedRef.current) setWorkError(e instanceof Error ? e.message : 'This download could not be removed. Please retry.');
    } finally { if (mountedRef.current) setDownloadBusy(false); }
  };

  const openHit = async (hit: LibraryHit) => {
    const work = LIBRARY_WORKS.find(w => w.id === hit.work_id);
    if (!work) return;
    setParams({ work: hit.work_id, section: hit.section_id, paragraph: String(hit.paragraph), book: undefined, chapter: undefined, verse: undefined, jump: undefined });
  };

  if (isReading && selectedWork) {
    return <LibraryReader
      key={`${selectedWork.id}:${params.section}:${params.paragraph ?? ''}`}
      appDb={appDb} work={selectedWork} initialSection={params.section === '__start__' ? undefined : params.section}
      initialParagraph={params.paragraph === undefined ? undefined : Number(params.paragraph)}
      onClose={() => setParams({ work: selectedWork.id, section: undefined, paragraph: undefined })}
      onPersistError={setReaderError}
    />;
  }

  if (selectedWork) {
    const isInstalled = installedIds.has(selectedWork.id);
    const needsRepair = availability.some(item => item.work_id === selectedWork.id && item.state === 'incomplete');
    const title = selectedWork.title;
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel={params.book ? 'Return to selected passage' : 'Back to Authors insight'} onPress={() => setParams({ work: undefined, section: undefined, paragraph: undefined })} style={styles.backLink}><Ionicons name="arrow-back" size={17} color={C.green} /><Text style={styles.backText}>{params.book ? 'Return to selected passage' : 'Authors insight'}</Text></Pressable>
          <Text style={styles.eyebrow}>{selectedWork.author.toUpperCase()} · {selectedWork.kind.toUpperCase()}</Text>
          <Text style={styles.detailTitle}>{title}</Text>
          <View style={styles.sourcePanel}>
            <Text style={styles.fieldLabel}>EDITION / SOURCE</Text><Text style={styles.fieldText}>{selectedWork.edition}</Text>
            <Text style={styles.fieldLabel}>RIGHTS</Text><Text style={styles.fieldText}>{selectedWork.rights}</Text>
            <Text style={styles.fieldLabel}>ATTRIBUTION</Text><Text style={styles.fieldText}>{selectedWork.attribution}</Text>
            <Pressable onPress={() => void Linking.openURL(selectedWork.sourceUrl)} style={styles.provenanceLink}><Ionicons name="open-outline" size={15} color={C.green} /><Text style={styles.linkText}>Open source edition</Text></Pressable>
            <Pressable onPress={() => void Linking.openURL(selectedWork.rightsUrl)} style={styles.provenanceLink}><Ionicons name="open-outline" size={15} color={C.green} /><Text style={styles.linkText}>Open rights statement</Text></Pressable>
            {selectedWork.package ? <Text style={styles.packageMeta}>Verified package · {selectedWork.package.sections} sections · {formatBytes(selectedWork.package.bytes)}</Text> : null}
          </View>
          {selectedWork.blocker ? <View style={styles.blocker}><Ionicons name="lock-closed-outline" size={18} color="#D5A78C" /><Text style={styles.blockerText}>{selectedWork.blocker}</Text><Text style={styles.blockerFoot}>This work cannot be downloaded in the app at this time.</Text></View> : null}
          {needsRepair ? <View style={styles.errorPanel}><Text style={styles.errorText}>Incomplete download. Repair downloads and replaces this work’s source text only. Your notes and reading position are kept.</Text></View> : null}
          {!isInstalled && selectedWork.package && !selectedWork.blocker ? <Text style={styles.deviceNote}>Full work download · {formatBytes(selectedWork.package.bytes)}. After installation, the original text is available offline on this device.{params.book ? ' You will return to your selected passage automatically.' : ''}</Text> : null}
          {pageError ? <View style={styles.errorPanel}><Text style={styles.errorText}>{pageError}</Text><Pressable accessibilityRole="button" onPress={() => void refreshInstalled()}><Text style={styles.linkText}>Retry loading downloads</Text></Pressable></View> : null}
          {workError ? <View style={styles.errorPanel}><Text style={styles.errorText}>{workError}</Text><Pressable onPress={() => selectedWork.package && !isInstalled ? void beginDownload(selectedWork) : void openDetail(selectedWork)} style={styles.retryLink}><Text style={styles.linkText}>Retry</Text></Pressable></View> : null}
          {downloadProgress ? <View style={styles.progressPanel}><Text style={styles.progressLabel}>{downloadProgress.phase === 'installing' ? 'Installing on this device' : 'Downloading verified text'}</Text><View style={styles.track}><View style={[styles.fill, { width: `${Math.round((downloadProgress.fraction ?? 0) * 100)}%` }]} /></View><Text style={styles.progressMeta}>{downloadProgress.fraction === null ? `${formatBytes(downloadProgress.received)} received` : `${Math.round(downloadProgress.fraction * 100)}%`}{downloadProgress.total > 0 ? ` · ${formatBytes(downloadProgress.total)}` : ''}</Text></View> : null}
          {isInstalled ? (
            <>
              <View style={styles.offlineNote}><Ionicons name="cloud-offline-outline" size={17} color={C.green} /><Text style={styles.offlineCopy}>Downloaded for offline reading on this device.</Text></View>
              <Pressable accessibilityRole="button" onPress={() => setParams({ work: selectedWork.id, section: detailPosition?.section_id ?? '__start__', paragraph: detailPosition ? String(detailPosition.paragraph) : undefined })} style={styles.primaryButton}><Text style={styles.primaryText}>{detailPosition ? 'Resume reading' : 'Read this work'}</Text><Ionicons name="arrow-forward" size={17} color="#10231B" /></Pressable>
              {detailNotices.map((notice, index) => <View key={`${index}-${notice}`} style={styles.notice}><Ionicons name="information-circle-outline" size={16} color={C.gold} /><Text style={styles.noticeText}>{notice}</Text></View>)}
              <Pressable disabled={downloadBusy} onPress={() => setRemoveVisible(true)} style={styles.removeButton}><Text style={styles.removeText}>Remove download</Text></Pressable>
            </>
          ) : selectedWork.package && !selectedWork.blocker ? (
            <Pressable accessibilityRole="button" disabled={downloadBusy} onPress={() => void beginDownload(selectedWork)} style={[styles.primaryButton, downloadBusy && styles.disabled]}>
              {downloadBusy ? <ActivityIndicator size="small" color="#10231B" /> : <><Ionicons name="download-outline" size={18} color="#10231B" /><Text style={styles.primaryText}>{needsRepair ? 'Repair download' : 'Download for offline use'}</Text></>}
            </Pressable>
          ) : null}
          <Text style={styles.deviceNote}>Library text is stored locally. Removing a work never deletes notes or reading position.</Text>
        </ScrollView>
        <Modal transparent visible={removeVisible} animationType="fade" onRequestClose={() => setRemoveVisible(false)}>
          <View style={styles.modalBackdrop}><View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove this download?</Text>
            <Text style={styles.modalBody}>The text will be removed from this device. Your personal notes and reading position are kept and will remain if you download the work again.</Text>
            <View style={styles.modalActions}><Pressable onPress={() => setRemoveVisible(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Keep download</Text></Pressable><Pressable disabled={downloadBusy} onPress={() => void confirmRemove()} style={styles.confirmButton}>{downloadBusy ? <ActivityIndicator color="#211D12" /> : <Text style={styles.confirmText}>Remove</Text>}</Pressable></View>
          </View></View>
        </Modal>
      </View>
    );
  }

  if (params.book && params.chapter) {
    return <PassageInsight
      key={`${params.book}:${params.chapter}:${params.verse ?? ''}:${params.jump ?? ''}:${installed.map(w => w.work_id).sort().join(',')}`}
      db={db} book={Number(params.book)} chapter={Number(params.chapter)}
      verse={params.verse === undefined ? undefined : Number(params.verse)}
      onOpenSection={row => setParams({ work: row.work_id, section: row.id, paragraph: undefined })}
      onOpenWork={id => setParams({ work: id, section: undefined, paragraph: undefined })}
      onClose={() => setParams({ book: undefined, chapter: undefined, verse: undefined, jump: undefined })}
    />;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={listItems}
        keyExtractor={item => item.type === 'hit'
          ? `${item.hit.work_id}:${item.hit.section_id}:${item.hit.paragraph}`
          : item.work.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.header}><View><Text style={styles.eyebrow}>GOSPELAI · HISTORICAL TEXTS</Text><Text style={styles.title}>Authors insight</Text></View><View style={styles.headerMark}><Ionicons name="library-outline" size={20} color={C.gold} /></View></View>
            <Text style={styles.intro}>Read enduring Christian writing, preserved with its sources and history.</Text>
            <View style={styles.localBanner}><Ionicons name="phone-portrait-outline" size={16} color={C.green} /><Text style={styles.localText}>Guest access · downloads and reading progress stay on this device.</Text></View>
            <View style={styles.searchBox}><Ionicons name="search-outline" size={18} color="#92929B" /><TextInput value={query} onChangeText={setQuery} placeholder="Search downloaded text" placeholderTextColor="#777780" style={styles.searchInput} returnKeyType="search" accessibilityLabel="Search downloaded library text" />{query ? <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color="#85858E" /></Pressable> : null}</View>
            <Text style={styles.scope}>Search downloaded text within the selected author and title.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.authorList}>
              {['All authors', ...LIBRARY_AUTHORS].map(name => <Pressable key={name} onPress={() => selectAuthor(name)} style={[styles.authorChip, author === name && styles.authorChipActive]}><Text style={[styles.authorChipText, author === name && styles.authorChipTextActive]}>{name}</Text></Pressable>)}
            </ScrollView>
            <Text style={styles.scopeLabel}>TITLE SCOPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.authorList}>
              <Pressable accessibilityRole="button" accessibilityLabel="Search all titles by selected author" onPress={() => setSelectedTitleId(null)} style={[styles.authorChip, !selectedTitleId && styles.authorChipActive]}>
                <Text style={[styles.authorChipText, !selectedTitleId && styles.authorChipTextActive]}>All titles</Text>
              </Pressable>
              {authorWorks.map(work => <Pressable key={work.id} accessibilityRole="button" accessibilityLabel={`Limit search to ${work.title}`} onPress={() => setSelectedTitleId(work.id)} style={[styles.authorChip, selectedTitleId === work.id && styles.authorChipActive]}>
                <Text style={[styles.authorChipText, selectedTitleId === work.id && styles.authorChipTextActive]}>{work.title}</Text>
              </Pressable>)}
            </ScrollView>
            {readerError ? <View style={styles.errorPanel}><Text style={styles.errorText}>{readerError}</Text><Pressable onPress={() => setReaderError(null)}><Text style={styles.linkText}>Dismiss</Text></Pressable></View> : null}
            {pageError ? <View style={styles.errorPanel}><Text style={styles.errorText}>{pageError}</Text><Pressable onPress={() => void refreshInstalled()}><Text style={styles.linkText}>Retry</Text></Pressable></View> : null}
            {query.trim() ? <View style={styles.resultsHead}><Text style={styles.sectionHeading}>SEARCH RESULTS</Text>{loading ? <ActivityIndicator color={C.green} /> : <Text style={styles.resultCount}>{hits.length} found</Text>}</View> : <Text style={styles.sectionHeading}>BROWSE WORKS</Text>}
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'hit') {
            const hit = item.hit;
            const work = LIBRARY_WORKS.find(candidate => candidate.id === hit.work_id);
            return <Pressable onPress={() => void openHit(hit)} style={styles.hitRow}>
              <Text style={styles.hitWork}>{work?.author ?? ''} · {work?.title ?? ''}</Text>
              <Text numberOfLines={3} style={styles.hitText}>{hit.text}</Text>
              <Text style={styles.hitMeta}>{hit.title} · paragraph {hit.paragraph + 1}</Text>
            </Pressable>;
          }
          const work = item.work;
          return <LibraryWorkCard work={work} installed={installedIds.has(work.id)} onPress={() => setParams({ work: work.id, section: undefined, paragraph: undefined })} />;
        }}
        ItemSeparatorComponent={() => <View style={{ height: 9 }} />}
        ListEmptyComponent={query.trim() ? (
          <View style={styles.emptyState}><View style={styles.emptyMark}><Ionicons name="search-outline" size={20} color={C.gold} /></View><Text style={styles.emptyTitle}>{loading ? 'Searching your library' : 'No matching passages'}</Text><Text style={styles.emptyBody}>{loading ? 'Looking through the downloaded works available for this device.' : 'Try another word, or clear this search to browse and download available works. Some listed works are rights-blocked and cannot be downloaded.'}</Text>{!loading && <Pressable onPress={() => setQuery('')} style={styles.emptyAction}><Text style={styles.linkText}>Browse available works</Text></Pressable>}</View>
        ) : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No works for this author</Text><Text style={styles.emptyBody}>Choose another author or view all works.</Text></View>}
        ListFooterComponent={<View style={styles.footer}><Text style={styles.footerTitle}>Three writers · carefully sourced</Text><Text style={styles.footerCopy}>This library keeps historical editions distinct from modern commentary and generative text.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { paddingTop: 17, paddingBottom: 38, paddingHorizontal: 16, flexGrow: 1 },
  header: { paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#9C8A59', fontSize: 9, fontWeight: '800', letterSpacing: 1.45 },
  title: { marginTop: 5, color: C.ink, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  headerMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#28231A', borderWidth: 1, borderColor: '#463B22' },
  intro: { marginHorizontal: 4, marginTop: 8, marginBottom: 14, color: C.muted, fontSize: 14, lineHeight: 21, maxWidth: 330 },
  localBanner: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 11, backgroundColor: '#111713', borderWidth: 1, borderColor: '#28382E', borderRadius: 12, marginBottom: 15 },
  localText: { flex: 1, color: '#A8B9AA', fontSize: 11, lineHeight: 16 },
  searchBox: { height: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: '#141318', borderWidth: 1, borderColor: '#302A28' },
  searchInput: { flex: 1, paddingVertical: 9, color: C.ink, fontSize: 14 },
  scope: { color: '#777780', fontSize: 10, marginTop: 7, marginBottom: 11, paddingHorizontal: 2 },
  scopeLabel: { color: '#9C8A59', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 7, marginLeft: 2 },
  authorList: { gap: 7, paddingBottom: 18 },
  authorChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#14151A', borderWidth: 1, borderColor: '#292A30' },
  authorChipActive: { backgroundColor: '#242116', borderColor: '#67582E' }, authorChipText: { color: '#A4A3AA', fontSize: 11, fontWeight: '600' }, authorChipTextActive: { color: C.gold },
  sectionHeading: { color: '#9C8A59', fontSize: 9, fontWeight: '800', letterSpacing: 1.35, marginHorizontal: 3, marginBottom: 10 },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resultCount: { color: C.muted, fontSize: 10, paddingBottom: 10 },
  emptyState: { alignItems: 'center', paddingHorizontal: 23, paddingVertical: 28, backgroundColor: '#111217', borderRadius: 16, borderWidth: 1, borderColor: '#26272D' },
  emptyMark: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#28231A', marginBottom: 10 },
  emptyTitle: { color: C.ink, fontWeight: '700', fontSize: 14, textAlign: 'center' }, emptyBody: { color: C.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 290 },
  footer: { paddingHorizontal: 5, paddingTop: 25, paddingBottom: 5 }, footerTitle: { color: '#D9D1BE', fontSize: 12, fontWeight: '700' }, footerCopy: { color: '#818189', fontSize: 10, lineHeight: 15, marginTop: 5 },
  detailTitle: { marginTop: 5, marginBottom: 16, color: C.ink, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18, minHeight: 34 }, backText: { color: C.green, fontSize: 12, fontWeight: '700' },
  sourcePanel: { padding: 15, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#121318' },
  fieldLabel: { color: '#9C8A59', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 11 }, fieldText: { color: '#C3C0B8', fontSize: 12, lineHeight: 18, marginTop: 4 },
  provenanceLink: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 38, marginTop: 5 }, linkText: { color: C.green, fontSize: 12, fontWeight: '700' },
  packageMeta: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, marginTop: 5, color: '#86868F', fontSize: 10 },
  blocker: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, padding: 13, borderRadius: 13, marginTop: 12, backgroundColor: '#211815', borderWidth: 1, borderColor: '#49312B' },
  blockerText: { flex: 1, color: '#E0B9A9', fontSize: 12, lineHeight: 18 }, blockerFoot: { width: '100%', color: '#AA887C', fontSize: 10, lineHeight: 15 },
  primaryButton: { minHeight: 48, paddingHorizontal: 15, borderRadius: 12, backgroundColor: C.green, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  primaryText: { flex: 1, color: '#10231B', fontWeight: '800', fontSize: 13 },
  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 3 }, offlineCopy: { color: '#A9B9AA', fontSize: 11 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#181711', borderRadius: 11, padding: 11, marginTop: 9 }, noticeText: { flex: 1, color: '#C9C1AD', fontSize: 11, lineHeight: 16 },
  removeButton: { alignSelf: 'center', padding: 13, marginTop: 7 }, removeText: { color: '#C09289', fontSize: 11, fontWeight: '700' },
  progressPanel: { padding: 13, marginTop: 13, borderRadius: 13, backgroundColor: '#111713', borderWidth: 1, borderColor: '#28382E' },
  progressLabel: { color: '#D7E1D7', fontSize: 12, fontWeight: '700' }, track: { height: 5, borderRadius: 4, backgroundColor: '#29332C', overflow: 'hidden', marginTop: 10 }, fill: { height: '100%', backgroundColor: C.green },
  progressMeta: { color: '#909A90', fontSize: 10, marginTop: 7 }, deviceNote: { color: '#83858A', fontSize: 10, lineHeight: 15, marginTop: 15, textAlign: 'center' },
  errorPanel: { padding: 13, borderRadius: 13, marginVertical: 9, backgroundColor: '#251818', borderWidth: 1, borderColor: '#54332E' }, errorText: { color: '#E0B9B1', fontSize: 12, lineHeight: 18 }, retryLink: { paddingTop: 9 },
  disabled: { opacity: 0.55 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#17181A', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#38352E' },
  modalTitle: { color: C.ink, fontSize: 20, fontWeight: '700' }, modalBody: { color: '#AAA8A0', fontSize: 13, lineHeight: 19, marginTop: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 21 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#25262A' }, cancelText: { color: '#D0CFCA', fontSize: 12, fontWeight: '700' },
  confirmButton: { minHeight: 42, minWidth: 94, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#D4B65F' }, confirmText: { color: '#211D12', fontSize: 12, fontWeight: '800' },
  results: { marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, padding: 12 },
  resultRow: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 10 }, resultTitle: { color: C.ink, fontSize: 12, fontWeight: '700' }, resultMeta: { color: C.gold, fontSize: 10, marginTop: 4 },
  searchLoading: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 }, muted: { color: C.muted, fontSize: 11 },
  hitRow: { padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel }, hitWork: { color: C.green, fontWeight: '700', fontSize: 10 }, hitText: { color: '#D6D1C7', fontSize: 12, lineHeight: 18, marginTop: 5 }, hitMeta: { color: '#8E8D95', fontSize: 10, marginTop: 5 },
  passageEmpty: { marginHorizontal: 15, marginBottom: 10, padding: 12, borderRadius: 13, backgroundColor: '#171711', borderWidth: 1, borderColor: '#413B29', flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' },
  passageEmptyText: { flex: 1, color: '#C9C1AD', fontSize: 11, lineHeight: 16 },
  emptyAction: { marginTop: 12, padding: 8 },
});

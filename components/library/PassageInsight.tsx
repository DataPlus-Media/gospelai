import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LIBRARY_WORKS } from '@/constants/libraryWorks';
import { BOOKS } from '@/constants/bibleBooks';
import {
  commentaryForPassage,
  installedWorks,
  readSection,
  workNotices,
  workAvailability,
} from '@/utils/library';
import type { InstalledWork, LibraryWork, PassageMatch } from '@/utils/libraryTypes';
import { coverageLabel, loadSelectedScripture, sourceDraft } from '@/utils/insight';
import PassageCatalogRow from '@/components/library/PassageCatalogRow';
import PassageSourceReading from '@/components/library/PassageSourceReading';
import { C, styles } from '@/components/library/PassageStyles';
import type { CatalogState, LoadedSource } from '@/components/library/PassageTypes';
import Colors from '@/constants/Colors';

function rowKey(row: PassageMatch) {
  return `${row.work_id}:${row.id}`;
}

function workFor(id: string) {
  return LIBRARY_WORKS.find(work => work.id === id);
}

export default function PassageInsight({
  db,
  book,
  chapter,
  verse,
  onOpenSection,
  onOpenWork,
  onClose,
}: {
  db: SQLiteDatabase;
  book: number;
  chapter: number;
  verse?: number;
  onOpenSection: (row: PassageMatch) => void;
  onOpenWork: (id: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 740;
  const [scripture, setScripture] = useState<{ reference: string; text: string; translation: string } | null>(null);
  const [scriptureError, setScriptureError] = useState<string | null>(null);
  const [rows, setRows] = useState<PassageMatch[]>([]);
  const [installed, setInstalled] = useState<InstalledWork[]>([]);
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof workAvailability>>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedSources, setLoadedSources] = useState<Record<string, LoadedSource>>({});
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({});
  const [sourceLoading, setSourceLoading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [mode, setMode] = useState<'authors' | 'compare'>('authors');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [confirmSource, setConfirmSource] = useState<PassageMatch | null>(null);
  const mounted = useRef(true);
  const requestToken = useRef(0);
  const detailTokens = useRef<Record<string, number>>({});
  const detailSequence = useRef(0);
  const previewAttempts = useRef(new Set<string>());

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadPassage = useCallback(async () => {
    const token = ++requestToken.current;
    setLoading(true);
    setLoadError(null);
    setRows([]);
    setAvailability([]);
    detailTokens.current = {};
    previewAttempts.current.clear();
    setLoadedSources({});
    setSourceErrors({});
    setSourceLoading({});
    setExpanded({});
    setSelectedKeys([]);
    try {
      const [matches, downloads, status] = await Promise.all([
        commentaryForPassage(db, book, chapter, verse),
        installedWorks(db),
        workAvailability(db, LIBRARY_WORKS),
      ]);
      if (mounted.current && token === requestToken.current) {
        const downloaded = new Set(status.filter(item => item.state === 'ready').map(item => item.work_id));
        setRows(matches.filter(row => {
          const work = workFor(row.work_id);
          return work?.kind === 'commentary' && !work.blocker && !work.appAccessBlocker && downloaded.has(row.work_id);
        }));
        setInstalled(downloads);
        setAvailability(status);
      }
    } catch (error) {
      if (mounted.current && token === requestToken.current) {
        setLoadError(error instanceof Error ? error.message : 'Passage insights could not be loaded.');
      }
    } finally {
      if (mounted.current && token === requestToken.current) setLoading(false);
    }
  }, [db, book, chapter, verse]);

  useFocusEffect(useCallback(() => {
    void loadPassage();
    return () => { requestToken.current++; };
  }, [loadPassage]));

  useEffect(() => {
    let active = true;
    setScripture(null);
    setScriptureError(null);
    loadSelectedScripture(book, chapter, verse).then(result => {
      if (active) setScripture(result);
    }).catch(error => {
      if (active) setScriptureError(error instanceof Error ? error.message : 'The selected Bible passage could not be loaded.');
    });
    return () => { active = false; };
  }, [book, chapter, verse]);

  const installedIds = useMemo(() => new Set(installed.map(item => item.work_id)), [installed]);
  const matchesByWork = useMemo(() => {
    const ids = new Set(rows.map(row => row.work_id));
    return ids;
  }, [rows]);
  const catalogStates = useMemo(() => {
    const states: { work: LibraryWork; state: CatalogState }[] = [];
    for (const work of LIBRARY_WORKS) {
      if (work.kind !== 'commentary') continue;
      const status = availability.find(item => item.work_id === work.id)?.state;
      if (!status) continue;
      if (status !== 'ready') states.push({ work, state: status });
      else if (!matchesByWork.has(work.id)) states.push({ work, state: 'unmapped' });
    }
    return states;
  }, [availability, matchesByWork]);
  const chapterLabel = BOOKS.find(item => item.id === book && chapter >= 1 && chapter <= item.chapters)
    ? `${BOOKS.find(item => item.id === book)!.name} ${chapter}` : undefined;
  const availableDownload = catalogStates.some(item => item.state === 'download' && item.work.id === 'henry-whole-bible' && chapterLabel);
  const devotionals = useMemo(() => LIBRARY_WORKS.filter(work => work.kind === 'devotional'), []);

  const loadSource = useCallback(async (row: PassageMatch) => {
    const key = rowKey(row);
    const work = workFor(row.work_id);
    if (!work || work.blocker || work.appAccessBlocker) return;
    if (loadedSources[key] || sourceLoading[key]) return;
    const token = ++detailSequence.current;
    detailTokens.current[key] = token;
    setSourceLoading(current => ({ ...current, [key]: true }));
    setSourceErrors(current => ({ ...current, [key]: '' }));
    try {
      const [content, notices] = await Promise.all([
        readSection(db, row.work_id, row.id),
        workNotices(db, row.work_id),
      ]);
      if (mounted.current && detailTokens.current[key] === token) {
        setLoadedSources(current => ({ ...current, [key]: { content, notices } }));
      }
    } catch (error) {
      if (mounted.current && detailTokens.current[key] === token) {
        setSourceErrors(current => ({
          ...current,
          [key]: error instanceof Error ? error.message : 'The downloaded section could not be opened.',
        }));
      }
    } finally {
      if (mounted.current && detailTokens.current[key] === token) {
        setSourceLoading(current => ({ ...current, [key]: false }));
      }
    }
  }, [db, loadedSources, sourceLoading]);

  useEffect(() => {
    rows.forEach(row => {
      const key = rowKey(row);
      if (previewAttempts.current.has(key)) return;
      previewAttempts.current.add(key);
      void loadSource(row);
    });
  }, [rows, loadSource]);

  const toggleCompare = (row: PassageMatch) => {
    setMode('compare');
    const key = rowKey(row);
    setSelectedKeys(current => {
      if (current.includes(key)) return current.filter(item => item !== key);
      if (current.length >= 2) return current;
      return [...current, key];
    });
    if (!loadedSources[key]) void loadSource(row);
  };

  const selectedRows = selectedKeys
    .map(key => rows.find(row => rowKey(row) === key))
    .filter((row): row is PassageMatch => !!row);

  const beginSourceDraft = () => {
    if (!confirmSource || !scripture) return;
    const key = rowKey(confirmSource);
    const loaded = loadedSources[key];
    const work = workFor(confirmSource.work_id);
    if (!loaded || !work || work.blocker || work.appAccessBlocker) return;
    const draft = sourceDraft(scripture, work, confirmSource, loaded.content);
    setConfirmSource(null);
    router.push({
      pathname: '/(auth)/(drawer)/(chat)/new',
      params: {
        draft,
        draftId: String(Date.now()),
        sourceDraft: '1',
      },
    });
  };

  const beginScriptureDraft = () => {
    if (!scripture) return;
    const draft = [
      `Help me understand ${scripture.reference}. Keep your AI-generated explanation separate from the Bible text and the historical author's original words.`,
      `SCRIPTURE · ${scripture.reference} · ${scripture.translation}\n${scripture.text}`,
      'MY QUESTION (edit before sending):\nWhat does this passage mean, and what is its context?',
    ].join('\n\n');
    router.push({
      pathname: '/(auth)/(drawer)/(chat)/new',
      params: { draft, draftId: String(Date.now()) },
    });
  };

  const openExternal = (url: string) => {
    void Linking.openURL(url).catch(() => setLinkError('We couldn’t open that source link. External editions and rights pages need an internet connection and a browser. Downloaded text is still available offline.'));
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topLine}>
          <View style={styles.headingBlock}>
            <Text style={styles.eyebrow}>GOSPELAI · HISTORICAL SOURCES</Text>
            <Text style={styles.title}>Authors insight</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close passage insight"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={19} color={C.ink} />
          </Pressable>
        </View>

        <View style={styles.scriptureCard}>
          <View style={styles.scriptureTop}>
            <View style={styles.scriptureMark}><Ionicons name="book-outline" size={17} color={C.gold} /></View>
            <View style={styles.scriptureHeading}>
              <Text style={styles.scriptureRef} selectable>{scripture?.reference ?? 'Selected passage'}</Text>
              <Text style={styles.translation}>{scripture?.translation ?? 'KING JAMES VERSION'}</Text>
            </View>
          </View>
          {scripture ? (
            <Text selectable testID="selected-scripture-text" style={styles.scriptureText}>{scripture.text}</Text>
          ) : scriptureError ? (
            <View style={styles.inlineError}>
              <Text style={styles.errorText}>{scriptureError}</Text>
              <Pressable accessibilityRole="button" onPress={() => {
                setScriptureError(null);
                loadSelectedScripture(book, chapter, verse).then(setScripture).catch(error =>
                  setScriptureError(error instanceof Error ? error.message : 'The selected Bible passage could not be loaded.'),
                );
              }}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : <View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, styles.skeletonShort]} /></View>}
        </View>

        <View style={styles.modeTabs}>
          {(['authors', 'compare'] as const).map(value => <Pressable key={value}
            accessibilityRole="button" accessibilityLabel={value === 'authors' ? 'Author Insights' : 'Compare sources'}
            accessibilityState={{ selected: mode === value }} aria-pressed={mode === value}
            onPress={() => setMode(value)} style={[styles.modeTab, mode === value && styles.modeTabActive]}>
            <Text style={[styles.modeTabText, mode === value && styles.modeTabTextActive]}>{value === 'authors' ? 'Author Insights' : 'Compare'}</Text>
          </Pressable>)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask AI about selected scripture"
            disabled={!scripture}
            onPress={beginScriptureDraft}
            style={[styles.modeTab, !scripture && styles.disabledButton]}
          >
            <Text style={styles.modeTabText}>Ask AI</Text>
          </Pressable>
        </View>
        {linkError && <Text accessibilityRole="alert" style={styles.errorText}>{linkError}</Text>}
        <View style={styles.sectionTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionEyebrow}>READ THE RECORD</Text>
            <Text style={styles.sectionTitle}>Commentaries on {scripture?.reference ?? 'selected passage'}</Text>
          </View>
          {loading ? <ActivityIndicator color={C.green} /> : !loadError && <Text style={styles.count}>{availableDownload ? 'Download available' : catalogStates.some(item => item.state === 'incomplete') ? 'Repair required' : `${rows.length} ${rows.length === 1 ? 'match' : 'matches'}`}</Text>}
        </View>
        <Text style={styles.intro}>
          Commentary appears only when a downloaded source names this passage. These are the authors’ preserved words, not AI-generated opinions.
        </Text>

        {loadError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadPassage()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry loading sources</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && rows.length === 0 && !loadError && !availableDownload ? (
          <View style={styles.emptyPanel}>
            <View style={styles.emptyMark}><Ionicons name="document-text-outline" size={19} color={C.gold} /></View>
            <Text style={styles.emptyTitle}>{catalogStates.some(item => item.state === 'incomplete') ? 'A commentary download needs repair' : 'No verified commentary for this passage'}</Text>
            <Text style={styles.emptyCopy}>The list below shows downloads that aren’t available, editions we can’t redistribute, and downloaded works without a verified match for this passage.</Text>
          </View>
        ) : null}

        {rows.map(row => {
          const work = workFor(row.work_id);
          if (!work) return null;
          const key = rowKey(row);
          const loaded = loadedSources[key];
          const isSelected = selectedKeys.includes(key);
          const isExpanded = !!expanded[key];
          const canSelect = isSelected || selectedKeys.length < 2;
          return (
            <View key={key} style={[styles.sourceCard, isSelected && styles.sourceCardSelected]}>
              <View style={styles.sourceCardHead}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${work.author} commentary`}
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => {
                    setExpanded(current => ({ ...current, [key]: !current[key] }));
                    if (!loaded) void loadSource(row);
                  }}
                  style={styles.sourceIdentity}
                >
                  <Text style={styles.authorName}>{work.author}</Text>
                  <Text selectable style={styles.workTitle}>{work.title}</Text>
                </Pressable>
                <View style={styles.coverageBadge}><Text style={styles.coverageText}>{coverageLabel(row)}</Text></View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${work.author} commentary`}
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => {
                    setExpanded(current => ({ ...current, [key]: !current[key] }));
                    if (!loaded) void loadSource(row);
                  }}
                  style={styles.expandChevron}
                >
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.gold} />
                </Pressable>
              </View>
              <Text selectable style={styles.sectionName}>{row.title}</Text>
              {mode === 'authors' && loaded?.content.paragraphs[0] ? (
                <View style={styles.excerptBlock}>
                  <Text selectable style={styles.sourceExcerpt}>
                    {loaded.content.paragraphs[0].text.length > 420
                      ? `${loaded.content.paragraphs[0].text.slice(0, 420).trimEnd()}…`
                      : loaded.content.paragraphs[0].text}
                  </Text>
                  <Text style={styles.excerptSource}>EXCERPT · DOWNLOADED SOURCE TEXT</Text>
                </View>
              ) : mode === 'authors' && sourceLoading[key] ? (
                <View style={styles.excerptSkeleton}><View style={styles.excerptSkeletonLine} /><View style={[styles.excerptSkeletonLine, styles.excerptSkeletonShort]} /></View>
              ) : null}
              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isSelected ? `Remove ${row.title} from comparison` : `Add ${row.title} to comparison`}
                  accessibilityState={{ selected: isSelected, disabled: !canSelect }}
                  disabled={!canSelect}
                  onPress={() => toggleCompare(row)}
                  style={[styles.compareButton, isSelected && styles.compareButtonActive, !canSelect && styles.disabledButton]}
                >
                  <Ionicons name={isSelected ? 'checkmark' : 'git-compare-outline'} size={15} color={isSelected ? Colors.onCoral : C.gold} />
                  <Text style={[styles.compareText, isSelected && styles.compareTextActive]}>
                    {isSelected ? 'In comparison' : 'Compare'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${isExpanded ? 'Hide' : 'Read'} full source section: ${row.title}`}
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => {
                    setExpanded(current => ({ ...current, [key]: !current[key] }));
                    if (!loaded) void loadSource(row);
                  }}
                  style={styles.textButton}
                >
                  <Text style={styles.textButtonLabel}>{isExpanded ? 'Hide section' : 'Read full section'}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.green} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${row.title} in the original reading view`}
                  onPress={() => onOpenSection(row)}
                  style={styles.openButton}
                >
                  <Text style={styles.openButtonText}>Open original</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.onCoral} />
                </Pressable>
              </View>
              {isExpanded && mode === 'authors' ? (
                <View style={styles.inlineSection}>
                  {sourceLoading[key] ? (
                    <View style={styles.loadingRow}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading downloaded section…</Text></View>
                  ) : sourceErrors[key] ? (
                    <View>
                      <Text style={styles.errorText}>{sourceErrors[key]}</Text>
                      <Pressable accessibilityRole="button" onPress={() => void loadSource(row)} style={styles.retryButton}><Text style={styles.retryText}>Retry section</Text></Pressable>
                    </View>
                  ) : loaded ? (
                  <PassageSourceReading work={work} row={row} loaded={loaded} onAsk={() => setConfirmSource(row)} onOpenLink={openExternal} />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {!loading && !loadError && mode === 'compare' && <View style={styles.compareSection}>
          <View style={styles.compareHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>SIDE BY SIDE</Text>
              <Text style={styles.sectionTitle}>Compare sources</Text>
            </View>
            <Text style={styles.compareCount}>{selectedKeys.length}/2</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Clear comparison" disabled={!selectedKeys.length}
              accessibilityState={{ disabled: !selectedKeys.length }}
              onPress={() => setSelectedKeys([])} style={styles.textButton}><Text style={styles.textButtonLabel}>Clear</Text></Pressable>
          </View>
          {selectedRows.length < 2 ? (
            <View style={styles.honestNote}>
              <Ionicons name="information-circle-outline" size={17} color={C.gold} />
              <Text style={styles.honestCopy}>
                {rows.length < 2
                  ? `Only ${rows.length} downloaded commentary source ${rows.length === 1 ? 'passage is' : 'passages are'} available for this scripture. Two are needed for comparison. Devotionals and rights-blocked works are not substitutes.`
                  : 'Choose two matching source passages above to compare them. Remove one to choose a different passage.'}
              </Text>
            </View>
          ) : null}
          <View style={[styles.comparePanels, wide && styles.comparePanelsWide]}>
            {[0, 1].map(index => {
              const row = selectedRows[index];
              const key = row ? rowKey(row) : `empty-${index}`;
              const work = row ? workFor(row.work_id) : undefined;
              const loaded = row ? loadedSources[key] : undefined;
              return (
                <View key={key} accessibilityLabel={`Comparison source ${index + 1}`} style={[styles.comparePanel, wide && styles.comparePanelWide, !row && styles.comparePanelEmpty]}>
                  {row && work ? (
                    <>
                      <View style={styles.comparePanelTop}>
                        <View style={styles.comparePanelCopy}>
                          <Text style={styles.compareAuthor}>{work.author}</Text>
                          <Text selectable style={styles.compareWork}>{work.title}</Text>
                          <Text selectable style={styles.compareSectionTitle}>{row.title}</Text>
                          <Text style={styles.compareCoverage}>{coverageLabel(row)}</Text>
                          {loaded ? (
                            <>
                              <Text selectable style={styles.compareEdition}>{work.edition}</Text>
                              <Text selectable style={styles.compareEdition}>{loaded.content.attribution}</Text>
                            </>
                          ) : null}
                        </View>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${row.title} from comparison`} onPress={() => toggleCompare(row)} style={styles.removeCompare}>
                          <Ionicons name="close" size={17} color={C.muted} />
                        </Pressable>
                      </View>
                      {sourceLoading[key] ? (
                        <View style={styles.loadingRow}><ActivityIndicator color={C.green} /><Text style={styles.muted}>Loading source…</Text></View>
                      ) : loaded ? (
                        <PassageSourceReading work={work} row={row} loaded={loaded} onAsk={() => setConfirmSource(row)} onOpenLink={openExternal} />
                      ) : sourceErrors[key] ? (
                        <View><Text style={styles.errorText}>{sourceErrors[key]}</Text>
                          <Pressable accessibilityRole="button" onPress={() => void loadSource(row)} style={styles.retryButton}><Text style={styles.retryText}>Retry section</Text></Pressable>
                        </View>
                      ) : <Text style={styles.muted}>Preparing the downloaded section…</Text>}
                    </>
                  ) : (
                    <View style={styles.comparePlaceholder}>
                      <Text style={styles.placeholderNumber}>0{index + 1}</Text>
                      <Text style={styles.placeholderTitle}>Choose a source above</Text>
                      <Text style={styles.placeholderCopy}>Only mapped, downloaded commentary can appear in this panel.</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>}

        {!loading && !loadError && catalogStates.length > 0 ? (
          <View style={styles.catalogSection}>
            <Text style={styles.sectionEyebrow}>CATALOG STATUS</Text>
            <Text style={styles.sectionTitle}>Other commentary</Text>
            <Text style={styles.catalogIntro}>Other works are shown as commentary for this verse only when the passage match is verified.</Text>
            {catalogStates.map(({ work, state }) => (
              <PassageCatalogRow key={work.id} work={work} state={state}
                chapterLabel={work.id === 'henry-whole-bible' ? chapterLabel : undefined}
                onOpen={() => onOpenWork(work.id)} />
            ))}
          </View>
        ) : null}

        {devotionals.length > 0 ? (
          <View style={styles.catalogSection}>
            <Text style={styles.sectionEyebrow}>A DIFFERENT KIND OF WORK</Text>
            <Text style={styles.sectionTitle}>Devotional reading</Text>
            <View style={styles.devotionalNote}>
              <Ionicons name="bookmark-outline" size={16} color={C.gold} />
              <Text style={styles.devotionalCopy}>
                These devotionals don’t have a verified verse match in the catalog. They’re kept separate and aren’t counted as commentary or included in source comparisons.
              </Text>
            </View>
            {devotionals.map(work => (
              <Pressable
                key={work.id}
                accessibilityRole="button"
                accessibilityLabel={`Open devotional work ${work.title} by ${work.author}`}
                onPress={() => onOpenWork(work.id)}
                style={styles.devotionalRow}
              >
                <View style={styles.devotionalIcon}><Ionicons name="book-outline" size={16} color={C.green} /></View>
                <View style={styles.devotionalInfo}>
                  <Text style={styles.authorName}>{work.author}</Text>
                  <Text style={styles.devotionalTitle}>{work.title}</Text>
                  <Text style={styles.devotionalState}>{installedIds.has(work.id) ? 'Downloaded · no verified verse mapping' : 'Not downloaded · no verified verse mapping'}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={C.green} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={styles.footer}>Historical source text is shown separately from Scripture and AI-generated responses.</Text>
      </ScrollView>

      <Modal transparent visible={!!confirmSource} animationType="fade" onRequestClose={() => setConfirmSource(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalMark}><Ionicons name="paper-plane-outline" size={19} color={C.gold} /></View>
            <Text style={styles.modalTitle}>Use this source in a question?</Text>
            <Text style={styles.modalBody}>
              The selected Bible passage and historical source text will be added to a draft for GospelAI’s AI chat. Nothing is sent until you review and send the draft. The reply is AI-generated, not a verified historical source.
            </Text>
            {confirmSource ? <Text style={styles.modalSource}>{workFor(confirmSource.work_id)?.author} · {confirmSource.title}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setConfirmSource(null)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Review draft"
                disabled={!confirmSource || !scripture || !loadedSources[rowKey(confirmSource)]}
                onPress={beginSourceDraft}
                style={[styles.confirmButton, (!confirmSource || !scripture || !loadedSources[rowKey(confirmSource)]) && styles.disabledButton]}
              >
                <Text style={styles.confirmText}>Review draft</Text>
                <Ionicons name="arrow-forward" size={15} color={Colors.onCoral} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


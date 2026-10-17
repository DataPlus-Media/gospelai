import Colors from '@/constants/Colors';
import VerseOfDay from '@/components/VerseOfDay';
import { getStudySummary, READING_PLAN, resetPlan, startPlan } from '@/utils/study';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type StudySummary = Awaited<ReturnType<typeof getStudySummary>>;

const ROUTES = {
  today: '/(auth)/(drawer)/today',
  bible: '/(auth)/(drawer)/bible',
  chat: '/(auth)/(drawer)/(chat)/new',
  notes: '/(auth)/(drawer)/notes',
  saved: '/saved',
  library: '/(auth)/(drawer)/library',
} as const;

function formatReference(position: StudySummary['position']) {
  if (!position) return 'Genesis 1:1';
  return `${position.book} ${position.chapter}:${position.verse}`;
}

export default function TodayScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetVisible, setResetVisible] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getStudySummary(db));
    } catch {
      setError('Your study progress could not be loaded. Your saved study data remains on this device.');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await getStudySummary(db);
          if (active) setSummary(result);
        } catch {
          if (active) setError('Your study progress could not be loaded. Your saved study data remains on this device.');
        } finally {
          if (active) setLoading(false);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [db])
  );

  const openBible = (ref: string, planDay?: number) => {
    router.navigate({
      pathname: ROUTES.bible,
      params: {
        ref,
        jump: String(Date.now()),
        ...(planDay === undefined ? {} : { planDay: String(planDay) }),
      },
    });
  };

  const beginPlan = async () => {
    setBusy(true);
    setError(null);
    try {
      await startPlan(db);
      await loadSummary();
    } catch {
      setError('The reading plan could not be started. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    setBusy(true);
    setError(null);
    try {
      await resetPlan(db);
      setResetVisible(false);
      await loadSummary();
    } catch {
      setError('The reading plan could not be reset. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const completed = summary?.plan.completed ?? [];
  const completedCount = completed.length;
  const nextDay = READING_PLAN.findIndex((_, index) => !completed.includes(index));
  const progress = READING_PLAN.length
    ? Math.min(completedCount / READING_PLAN.length, 1)
    : 0;
  const currentReference = formatReference(summary?.position ?? null);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GOSPELAI · YOUR DAILY SPACE</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <View style={styles.mark} accessibilityLabel="GospelAI">
            <Ionicons name="book-outline" size={20} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.intro}>
          A little time in the Word can change the shape of a day.
        </Text>

        <View style={styles.readingCard}>
          <View style={styles.readingCopy}>
            <View style={styles.kickerRow}>
              <View style={styles.liveDot} />
              <Text style={styles.kicker}>PICK UP WHERE YOU LEFT OFF</Text>
            </View>
            <Text style={styles.readingTitle}>Continue reading</Text>
            <Text style={styles.readingRef}>{currentReference}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continue reading ${currentReference}`}
            onPress={() => openBible(currentReference)}
            style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
          >
            <Text style={styles.continueText}>Open Bible</Text>
            <Ionicons name="arrow-forward" size={17} color="#10231B" />
          </Pressable>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(ROUTES.chat)}
            style={({ pressed }) => [styles.chatAction, pressed && styles.pressed]}
          >
            <View style={styles.chatIcon}>
              <Ionicons name="sparkles-outline" size={19} color="#D6B96C" />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Start a chat</Text>
              <Text style={styles.actionSub}>Ask, reflect, explore</Text>
            </View>
            <Ionicons name="arrow-forward" size={17} color="#9696A0" />
          </Pressable>
        </View>

        <VerseOfDay />

        <View style={styles.planSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>BUILD A RHYTHM</Text>
              <Text style={styles.sectionTitle}>Seven days in the Word</Text>
            </View>
            <View style={styles.planBadge}>
              <Ionicons name="calendar-clear-outline" size={14} color={Colors.primary} />
              <Text style={styles.planBadgeText}>7 DAY PLAN</Text>
            </View>
          </View>
          <Text style={styles.planDescription}>
            One focused reading each day. Readings work offline; AI chat needs an internet connection.
          </Text>

          {loading ? (
            <View style={styles.loadingPanel} accessibilityLabel="Loading reading plan">
              <View style={styles.skeletonBarWide} />
              <View style={styles.skeletonBarShort} />
              <View style={styles.skeletonBarWide} />
            </View>
          ) : error ? (
            <View style={styles.errorPanel} accessibilityRole="alert">
              <Ionicons name="cloud-offline-outline" size={20} color="#F0A69B" />
              <View style={styles.errorCopy}>
                <Text style={styles.errorTitle}>Study data unavailable</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading study progress"
                onPress={loadSummary}
                style={styles.retryButton}
              >
                <Ionicons name="refresh" size={18} color="#F2D694" />
              </Pressable>
            </View>
          ) : (
            <>
              {summary?.plan.started ? (
                <View style={styles.progressCard}>
                  <View style={styles.progressMeta}>
                    <Text style={styles.progressLabel}>
                      {completedCount === READING_PLAN.length
                        ? 'Plan complete'
                        : `Day ${nextDay + 1} of ${READING_PLAN.length}`}
                    </Text>
                    <Text style={styles.progressCount}>{completedCount}/{READING_PLAN.length}</Text>
                  </View>
                  <View
                    style={styles.progressTrack}
                    accessibilityRole="progressbar"
                    accessibilityLabel="Reading plan progress"
                    accessibilityValue={{ min: 0, max: READING_PLAN.length, now: completedCount }}
                  >
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  {nextDay >= 0 && <Pressable accessibilityRole="button" onPress={() => openBible(READING_PLAN[nextDay].reference, nextDay)}
                    style={{ paddingTop: 14, paddingBottom: 6, minHeight: 44 }}>
                    <Text style={{ color: '#91d7ae', fontWeight: '700' }}>Resume plan · {READING_PLAN[nextDay].reference}</Text>
                  </Pressable>}
                </View>
              ) : (
                <View style={styles.startPlanPanel}>
                  <View style={styles.startPlanText}>
                    <Text style={styles.startPlanTitle}>Make room for the Word.</Text>
                    <Text style={styles.startPlanSub}>Start whenever you’re ready. Your progress stays on this device.</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={beginPlan}
                    style={({ pressed }) => [styles.startButton, pressed && styles.pressed, busy && styles.disabled]}
                  >
                    {busy ? <ActivityIndicator size="small" color="#10231B" /> : <Text style={styles.startButtonText}>Start plan</Text>}
                  </Pressable>
                </View>
              )}

              <View style={styles.planList}>
                {READING_PLAN.map((day, index) => {
                  const done = completed.includes(index);
                  return (
                    <Pressable
                      key={`${index}-${day.reference}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Day ${index + 1}: ${day.title}, ${day.reference}${done ? ', completed' : ''}`}
                      onPress={() => openBible(day.reference, index)}
                      style={({ pressed }) => [
                        styles.dayRow,
                        done && styles.dayRowDone,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.dayNumber, done && styles.dayNumberDone]}>
                        {done ? (
                          <Ionicons name="checkmark" size={16} color="#0E2119" />
                        ) : (
                          <Text style={styles.dayNumberText}>{String(index + 1).padStart(2, '0')}</Text>
                        )}
                      </View>
                      <View style={styles.dayCopy}>
                        <Text style={[styles.dayTitle, done && styles.dayTitleDone]}>{day.title}</Text>
                        <Text style={styles.dayReference}>{day.reference}</Text>
                      </View>
                      <Text style={[styles.dayStatus, done && styles.dayStatusDone]}>
                        {done ? 'READ' : 'OPEN'}
                      </Text>
                      <Ionicons name="chevron-forward" size={17} color="#676973" />
                    </Pressable>
                  );
                })}
              </View>
              {summary?.plan.started ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setResetVisible(true)}
                  style={styles.resetLink}
                >
                  <Text style={styles.resetText}>Reset plan progress</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.shortcuts}>
          <View style={styles.shortcutHeading}>
            <Text style={styles.sectionEyebrow}>YOUR LIBRARY</Text>
            <Text style={styles.sectionTitle}>Go where you need</Text>
          </View>
          <View style={styles.shortcutGrid}>
            <Shortcut icon="book-outline" label="Bible" hint="Read scripture" onPress={() => router.push(ROUTES.bible)} />
            <Shortcut icon="chatbubble-ellipses-outline" label="Chat" hint="Talk it through" onPress={() => router.push(ROUTES.chat)} />
            <Shortcut icon="document-text-outline" label="Notes" hint="Your reflections" onPress={() => router.push(ROUTES.notes)} />
            <Shortcut icon="bookmark-outline" label="Saved" hint="Keep close" onPress={() => router.push(ROUTES.saved)} />
            <Shortcut icon="library-outline" label="Authors insight" hint="Study Christian authors" onPress={() => router.push(ROUTES.library)} />
          </View>
        </View>

        <View style={styles.deviceNote}>
          <Ionicons name="lock-closed-outline" size={15} color="#85B99E" />
          <Text style={styles.deviceNoteText}>
            Your study progress is stored on this device. Scripture readings are available offline.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={resetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal accessibilityRole="alert">
            <View style={styles.modalIcon}>
              <Ionicons name="refresh-outline" size={22} color="#F0C76A" />
            </View>
            <Text style={styles.modalTitle}>Reset your plan?</Text>
            <Text style={styles.modalBody}>
              This clears all seven-day plan progress on this device. You can start again anytime.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setResetVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Keep progress</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={confirmReset}
                style={[styles.confirmButton, busy && styles.disabled]}
              >
                {busy ? <ActivityIndicator size="small" color="#1B1A16" /> : <Text style={styles.confirmText}>Reset plan</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Shortcut({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
    >
      <View style={styles.shortcutIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <Text style={styles.shortcutLabel}>{label}</Text>
      <Text style={styles.shortcutHint}>{hint}</Text>
      <Ionicons name="arrow-forward" size={13} color="#777984" style={styles.shortcutArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { paddingTop: 18, paddingBottom: 40 },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: '#9C8A59', fontSize: 10, fontWeight: '800', letterSpacing: 1.55 },
  title: { marginTop: 5, color: '#F5F1E8', fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  mark: {
    width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#14241D', borderWidth: 1, borderColor: '#294334',
  },
  intro: {
    marginHorizontal: 20, marginTop: 7, marginBottom: 20, maxWidth: 330,
    color: '#9B9AA2', fontSize: 14, lineHeight: 21,
  },
  readingCard: {
    marginHorizontal: 16, padding: 17, borderRadius: 19, backgroundColor: '#14251D',
    borderWidth: 1, borderColor: '#294537', overflow: 'hidden',
  },
  readingCopy: { marginBottom: 16 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#70C597' },
  kicker: { color: '#9CC5A9', fontSize: 9, fontWeight: '800', letterSpacing: 1.15 },
  readingTitle: { marginTop: 10, color: '#F3F0E8', fontWeight: '700', fontSize: 21, letterSpacing: -0.4 },
  readingRef: { color: '#A8C7B1', fontSize: 14, marginTop: 3, fontWeight: '500' },
  continueButton: {
    backgroundColor: '#80C59A', minHeight: 44, borderRadius: 12, paddingHorizontal: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  continueText: { color: '#10231B', fontWeight: '800', fontSize: 14 },
  quickActions: { marginHorizontal: 16, marginTop: 10, marginBottom: 14 },
  chatAction: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderRadius: 15,
    backgroundColor: '#141318', borderWidth: 1, borderColor: '#302A28',
  },
  chatIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#28231A', alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1 },
  actionTitle: { color: '#F1EDE5', fontSize: 14, fontWeight: '700' },
  actionSub: { color: '#929099', fontSize: 12, marginTop: 2 },
  planSection: { marginTop: 23, marginHorizontal: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: '#9C8A59', fontSize: 9, fontWeight: '800', letterSpacing: 1.35 },
  sectionTitle: { color: '#F0EEE8', fontSize: 20, fontWeight: '700', letterSpacing: -0.45, marginTop: 4 },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#30312D', backgroundColor: '#141613',
  },
  planBadgeText: { color: '#A6B8A8', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  planDescription: { color: '#9998A0', fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 13, maxWidth: 340 },
  loadingPanel: {
    backgroundColor: '#111217', borderRadius: 15, borderWidth: 1, borderColor: '#24252B',
    padding: 16, gap: 11,
  },
  skeletonBarWide: { height: 13, width: '88%', borderRadius: 7, backgroundColor: '#25262D' },
  skeletonBarShort: { height: 12, width: '55%', borderRadius: 7, backgroundColor: '#202127' },
  errorPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14,
    backgroundColor: '#251818', borderWidth: 1, borderColor: '#54332E',
  },
  errorCopy: { flex: 1 },
  errorTitle: { color: '#F2D8D3', fontSize: 13, fontWeight: '700' },
  errorText: { color: '#C3A29D', fontSize: 11, lineHeight: 16, marginTop: 3 },
  retryButton: { padding: 8, borderRadius: 10, backgroundColor: '#39231F' },
  progressCard: { padding: 13, borderRadius: 14, backgroundColor: '#111713', borderWidth: 1, borderColor: '#28382E', marginBottom: 10 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  progressLabel: { color: '#D7E1D7', fontSize: 12, fontWeight: '700' },
  progressCount: { color: '#8FB79B', fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 5, backgroundColor: '#29332C', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#73B98D', borderRadius: 4 },
  startPlanPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 15,
    backgroundColor: '#151A16', borderWidth: 1, borderColor: '#30392F', marginBottom: 10,
  },
  startPlanText: { flex: 1 },
  startPlanTitle: { color: '#F0EEE6', fontSize: 13, fontWeight: '700' },
  startPlanSub: { color: '#96979A', fontSize: 11, lineHeight: 16, marginTop: 4 },
  startButton: { backgroundColor: '#80C59A', borderRadius: 10, paddingHorizontal: 13, minHeight: 38, justifyContent: 'center', alignItems: 'center' },
  startButtonText: { color: '#10231B', fontSize: 12, fontWeight: '800' },
  planList: { borderRadius: 16, backgroundColor: '#111217', borderWidth: 1, borderColor: '#26272D', overflow: 'hidden' },
  dayRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#292A30' },
  dayRowDone: { backgroundColor: '#121914' },
  dayNumber: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#202127' },
  dayNumberDone: { backgroundColor: '#80C59A' },
  dayNumberText: { color: '#B9B8C0', fontSize: 10, fontWeight: '800' },
  dayCopy: { flex: 1 },
  dayTitle: { color: '#EAE8E2', fontSize: 13, fontWeight: '600' },
  dayTitleDone: { color: '#C3D7C8' },
  dayReference: { color: '#8D8D96', fontSize: 11, marginTop: 3 },
  dayStatus: { color: '#666873', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  dayStatusDone: { color: '#85B99A' },
  resetLink: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 2 },
  resetText: { color: '#A59A85', fontSize: 11, textDecorationLine: 'underline' },
  shortcuts: { marginTop: 22, marginHorizontal: 16 },
  shortcutHeading: { marginBottom: 12 },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  shortcut: {
    width: '48.5%', minHeight: 105, padding: 12, borderRadius: 15, backgroundColor: '#121318',
    borderWidth: 1, borderColor: '#27282F',
  },
  shortcutIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#18221C', alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  shortcutLabel: { color: '#ECEAE3', fontSize: 13, fontWeight: '700' },
  shortcutHint: { color: '#85858E', fontSize: 10, marginTop: 3 },
  shortcutArrow: { position: 'absolute', right: 12, top: 13 },
  deviceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 20 },
  deviceNoteText: { flex: 1, color: '#83858A', fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#17181A', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#38352E' },
  modalIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#2B261A', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle: { color: '#F3F0E8', fontSize: 20, fontWeight: '700' },
  modalBody: { color: '#AAA8A0', fontSize: 13, lineHeight: 19, marginTop: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 21 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#25262A' },
  cancelText: { color: '#D0CFCA', fontSize: 12, fontWeight: '700' },
  confirmButton: { minHeight: 42, minWidth: 94, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13, borderRadius: 11, backgroundColor: '#D4B65F' },
  confirmText: { color: '#211D12', fontSize: 12, fontWeight: '800' },
});

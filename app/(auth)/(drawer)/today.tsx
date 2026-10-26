import TodayTheme from '@/constants/TodayTheme';
import VerseOfDay from '@/components/VerseOfDay';
import { getStudySummary } from '@/utils/study';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scriptureFontFamily, spacing } from '@/constants/DesignTokens';
import {
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

function greetingForNow(firstName?: string | null) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = firstName?.trim();
  return name ? `${timeOfDay}, ${name}.` : `${timeOfDay}.`;
}

export default function TodayScreen() {
  const { isSignedIn, user } = useUser();
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getStudySummary(db));
    } catch {
      setError('We couldn’t load your study progress. Your study data is still saved on this device.');
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
          if (active) setError('We couldn’t load your study progress. Your study data is still saved on this device.');
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

  const openBible = (ref: string) => {
    router.navigate({
      pathname: ROUTES.bible,
      params: {
        ref,
        jump: String(Date.now()),
      },
    });
  };
  const currentReference = formatReference(summary?.position ?? null);
  const currentDisplayReference = `${currentReference} · KJV`;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introduction}>
          <Text style={styles.eyebrow}>YOUR DAILY STUDY</Text>
          <Text style={styles.title}>{greetingForNow(isSignedIn ? user?.firstName : null)}</Text>
          <Text style={styles.intro}>A little time in the Word. A deeper understanding.</Text>
        </View>

        <View style={styles.readingCard}>
          <View style={styles.readingCopy}>
            <View style={styles.kickerRow}>
              <View style={styles.liveDot} />
              <Text style={styles.kicker}>PICK UP WHERE YOU LEFT OFF</Text>
            </View>
            <Text style={styles.readingTitle}>Continue reading</Text>
            <Text style={styles.readingRef}>
              {loading ? 'Loading your reading position…' : summary ? currentDisplayReference : 'Reading position unavailable'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continue reading ${currentReference}`}
            accessibilityState={{ disabled: loading || !summary }}
            disabled={loading || !summary}
            onPress={() => openBible(currentReference)}
            style={({ pressed }) => [styles.continueButton, pressed && styles.pressed, (loading || !summary) && styles.disabled]}
          >
            <Text style={styles.continueText}>Open Bible</Text>
            <Ionicons name="arrow-forward" size={17} color={TodayTheme.mintInk} />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.errorPanel, { marginHorizontal: 16, marginTop: 12 }]} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={20} color="#F0A69B" />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Couldn’t load your reading position</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading reading position"
              onPress={loadSummary}
              style={styles.retryButton}
            >
              <Ionicons name="refresh" size={18} color={TodayTheme.mint} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.quickActions}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ask GospelAI about Scripture"
            onPress={() => router.push(ROUTES.chat)}
            style={({ pressed }) => [styles.chatAction, pressed && styles.pressed]}
          >
            <Ionicons name="sparkles-outline" size={17} color={TodayTheme.mintInk} />
            <Text style={styles.chatActionText}>Ask GospelAI about Scripture</Text>
          </Pressable>
        </View>

        <VerseOfDay variant="today" />

        <View style={styles.shortcuts}>
          <View style={styles.shortcutHeading}>
            <Text style={styles.sectionEyebrow}>YOUR LIBRARY</Text>
            <Text style={styles.sectionTitle}>Keep exploring</Text>
          </View>
          <View style={styles.shortcutGrid}>
            <Shortcut icon="book-outline" label="Bible" hint="Read Scripture" onPress={() => router.push(ROUTES.bible)} />
            <Shortcut icon="chatbubble-ellipses-outline" label="Chat" hint="Talk it through" onPress={() => router.push(ROUTES.chat)} />
            <Shortcut icon="document-text-outline" label="Notes" hint="Your reflections" onPress={() => router.push(ROUTES.notes)} />
            <Shortcut icon="bookmark-outline" label="Saved" hint="Bookmarks and highlights" onPress={() => router.push(ROUTES.saved)} />
            <Shortcut icon="library-outline" label="Authors insight" hint="Read Christian authors" onPress={() => router.push(ROUTES.library)} />
          </View>
        </View>

        <View style={styles.deviceNote}>
          <Ionicons name="lock-closed-outline" size={15} color={TodayTheme.mint} />
          <Text style={styles.deviceNoteText}>
            Your study progress is stored on this device. Scripture readings are available offline.
          </Text>
        </View>
      </ScrollView>

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
        <Ionicons name={icon} size={20} color={TodayTheme.mint} />
      </View>
      <Text style={styles.shortcutLabel}>{label}</Text>
      <Text style={styles.shortcutHint}>{hint}</Text>
      <Ionicons name="arrow-forward" size={13} color="#777984" style={styles.shortcutArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TodayTheme.background },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingTop: 26, paddingBottom: 40 },
  introduction: { paddingHorizontal: 20, marginBottom: 19 },
  eyebrow: { color: TodayTheme.mint, fontSize: 11, fontWeight: '800', letterSpacing: 2.1 },
  title: { marginTop: 11, color: TodayTheme.text, fontFamily: scriptureFontFamily, fontSize: 35, lineHeight: 43, fontWeight: '500', letterSpacing: -1.2 },
  intro: { marginTop: 13, color: TodayTheme.textMuted, fontSize: 15, lineHeight: 22 },
  readingCard: {
    marginHorizontal: 16, padding: 20, borderRadius: 20, backgroundColor: TodayTheme.surface,
    borderWidth: 1, borderColor: TodayTheme.border, overflow: 'hidden',
  },
  readingCopy: { marginBottom: 17 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TodayTheme.mint },
  kicker: { color: TodayTheme.mint, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  readingTitle: { marginTop: 12, color: TodayTheme.text, fontWeight: '700', fontSize: 21, letterSpacing: -0.4 },
  readingRef: { color: TodayTheme.textMuted, fontSize: 15, marginTop: 7, fontWeight: '500' },
  continueButton: {
    backgroundColor: TodayTheme.mint, minHeight: 50, borderRadius: 12, paddingHorizontal: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  continueText: { color: TodayTheme.mintInk, fontWeight: '800', fontSize: 15 },
  quickActions: { marginHorizontal: 16, marginTop: 16, marginBottom: 17 },
  chatAction: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, gap: 10, borderRadius: 13, backgroundColor: TodayTheme.mint,
  },
  chatActionText: { color: TodayTheme.mintInk, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  sectionEyebrow: { color: TodayTheme.mint, fontSize: 10, fontWeight: '800', letterSpacing: 1.7 },
  sectionTitle: { color: TodayTheme.text, fontSize: 21, fontWeight: '700', letterSpacing: -0.45, marginTop: 5 },
  errorPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14,
    backgroundColor: TodayTheme.errorSurface, borderWidth: 1, borderColor: TodayTheme.errorBorder,
  },
  errorCopy: { flex: 1 },
  errorTitle: { color: TodayTheme.errorText, fontSize: 14, fontWeight: '700' },
  errorText: { color: '#C9A9A3', fontSize: 12, lineHeight: 17, marginTop: 3 },
  retryButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#412C2B' },
  shortcuts: { marginTop: 22, marginHorizontal: 16 },
  shortcutHeading: { marginBottom: 12 },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  shortcut: {
    flexGrow: 1, flexBasis: '46%', minHeight: 110, padding: 13, borderRadius: 15, backgroundColor: TodayTheme.surface,
    borderWidth: 1, borderColor: TodayTheme.border,
  },
  shortcutIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: TodayTheme.mintDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  shortcutLabel: { color: TodayTheme.text, fontSize: 14, fontWeight: '700' },
  shortcutHint: { color: TodayTheme.textMuted, fontSize: 11, marginTop: 3 },
  shortcutArrow: { position: 'absolute', right: 12, top: 13 },
  deviceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 20 },
  deviceNoteText: { flex: 1, color: TodayTheme.textSubtle, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.6 },
});

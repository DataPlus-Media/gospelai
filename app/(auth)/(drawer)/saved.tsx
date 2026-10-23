import { getSavedVerses, referenceOf, SavedVerse, toggleSavedVerse } from '@/utils/study';
import Colors from '@/constants/Colors';
import { scriptureFontFamily, spacing, typography } from '@/constants/DesignTokens';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SavedScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SavedVerse[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setItems(await getSavedVerses(db)); setError(''); }
    catch { setError('We couldn’t load your saved verses. Try again.'); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function remove(item: SavedVerse) {
    try { await toggleSavedVerse(db, item, true); await load(); }
    catch { setError('We couldn’t remove this saved verse. Try again.'); }
  }
  return <View style={s.page}>
    <Text style={s.hint}>Your bookmarks and highlights are saved on this device.</Text>
    {!!error && <Pressable accessibilityRole="button" onPress={load}><Text style={s.error}>{error}</Text></Pressable>}
    <FlatList data={items} keyExtractor={i => `${referenceOf(i)}-${i.kind}`}
      style={s.list}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
      ListEmptyComponent={<Text style={s.hint}>No saved verses yet. Tap a verse in the Bible to bookmark or highlight it.</Text>}
      renderItem={({ item }) => <View style={s.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Read ${referenceOf(item)}`}
          onPress={() => router.navigate({ pathname: '/(auth)/(drawer)/bible', params: { ref: referenceOf(item), jump: String(Date.now()) } })}>
          <Text style={s.ref}>{referenceOf(item)} · KJV · {item.kind}</Text>
          <Text style={s.text}>{item.text}</Text>
          <Text style={s.link}>Open this verse</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.kind} for ${referenceOf(item)}`}
          onPress={() => remove(item)} style={s.remove}><Text style={s.error}>Remove {item.kind}</Text></Pressable>
      </View>} />
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background, padding: spacing.lg },
  list: { width: '100%', maxWidth: 840, alignSelf: 'center' },
  hint: { width: '100%', maxWidth: 840, alignSelf: 'center', color: Colors.textMuted, lineHeight: 22, marginBottom: spacing.lg },
  card: { padding: spacing.lg, backgroundColor: Colors.surface, borderRadius: 16, marginBottom: spacing.md, borderColor: Colors.border, borderWidth: 1 },
  text: { color: Colors.scripture, fontSize: typography.reading, lineHeight: typography.readingLineHeight, marginVertical: spacing.md, fontFamily: scriptureFontFamily },
  ref: { color: Colors.coral, fontWeight: '700' }, link: { color: Colors.coralSoft, paddingVertical: spacing.sm },
  error: { color: Colors.coralSoft, paddingVertical: spacing.sm }, remove: { minHeight: 44, justifyContent: 'center' },
});

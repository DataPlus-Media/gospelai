import { getSavedVerses, referenceOf, SavedVerse, toggleSavedVerse } from '@/utils/study';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function SavedScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
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
  page: { flex: 1, backgroundColor: '#0b0b10', padding: 16 },
  hint: { color: '#b8bcc7', lineHeight: 22, marginBottom: 16 },
  card: { padding: 16, backgroundColor: '#111217', borderRadius: 14, marginBottom: 12, borderColor: '#232633', borderWidth: 1 },
  text: { color: '#f3f4f6', fontSize: 16, lineHeight: 25, marginVertical: 12 },
  ref: { color: '#c8a951', fontWeight: '700' }, link: { color: '#57d99e', paddingVertical: 8 },
  error: { color: '#ffa6a6', paddingVertical: 8 }, remove: { minHeight: 44, justifyContent: 'center' },
});

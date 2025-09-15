import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TextInput, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as SQLite from 'expo-sqlite';
import { Stack } from 'expo-router';

import Colors from '@/constants/Colors';
import HeaderDropDown from '@/components/HeaderDropDown';
import { BOOKS, BOOK_NAME_TO_ID } from '@/constants/bibleBooks';

/** Types */
type VerseRow = { verse: number; text: string };

/** Ensure kjv.sqlite exists in the app's SQLite folder, then open it. */
async function openBibleDb(): Promise<SQLite.SQLiteDatabase> {
  // Expo expects DBs in <documentDirectory>/SQLite/
  const sqliteDir = FileSystem.documentDirectory + 'SQLite';
  const dbPath = `${sqliteDir}/kjv.sqlite`;

  // Make sure the SQLite directory exists
  const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
  }

  // If DB file is missing, copy from bundled asset
  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  if (!dbInfo.exists) {
    const asset = Asset.fromModule(require('@/assets/bible/kjv.sqlite'));
    await asset.downloadAsync();
    // asset.localUri points to the downloaded/cached file — copy it to SQLite/
    if (asset.localUri) {
      await FileSystem.copyAsync({ from: asset.localUri, to: dbPath });
    } else if (asset.uri) {
      // fallback
      await FileSystem.copyAsync({ from: asset.uri, to: dbPath });
    } else {
      throw new Error('Unable to locate bundled kjv.sqlite asset');
    }
  }

  // Open it
  return SQLite.openDatabaseAsync('kjv.sqlite');
}

export default function BibleScreen() {
  // Header state (version dropdown – fixed to KJV for now)
  const [version, setVersion] = useState<'kjv'>('kjv');

  // Bible UI state
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [error, setError] = useState<string>('');

  const [bookName, setBookName] = useState<string>('Genesis');
  const [chapter, setChapter] = useState<number>(1);
  const [query, setQuery] = useState<string>('');

  const [rows, setRows] = useState<VerseRow[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  // 1) Open DB once
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

  // 2) Clamp chapter to valid range when book changes
  useEffect(() => {
    const meta = BOOKS.find((b) => b.name === bookName);
    if (!meta) return;
    if (chapter > meta.chapters) setChapter(meta.chapters);
    if (chapter < 1) setChapter(1);
  }, [bookName, chapter]);

  // 3) Query verses for (book, chapter)
  useEffect(() => {
    if (!db) return;

    (async () => {
      try {
        setLoadingVerses(true);
        const bookId = BOOK_NAME_TO_ID[bookName];

        // Your DB might be "verse" OR "verses" — try both
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

  // 4) In-chapter client filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.text.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <View style={styles.page}>
      {/* Header matches Chat: HeaderDropDown */}
      <Stack.Screen
        options={{
          headerTitle: () => (
            <HeaderDropDown
              title="Bible"
              items={[
                { key: 'kjv', title: 'KJV', icon: 'book' as any }, // keep the same component contract
              ]}
              selected={version}
              onSelect={(k) => setVersion(k as 'kjv')}
            />
          ),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.selected },
        }}
      />

      {/* Top controls */}
      <View style={styles.controls}>
        <View style={styles.field}>
          <Text style={styles.label}>Book</Text>
          <View style={styles.selectLike}>
            <TextInput
              value={bookName}
              onChangeText={(txt) => {
                // pick the nearest valid book by prefix; or exact match
                const hit =
                  BOOKS.find((b) => b.name.toLowerCase() === txt.trim().toLowerCase()) ||
                  BOOKS.find((b) => b.name.toLowerCase().startsWith(txt.trim().toLowerCase()));
                if (hit) {
                  setBookName(hit.name);
                  // ensure chapter within range
                  if (chapter > hit.chapters) setChapter(hit.chapters);
                } else {
                  // allow free typing until they hit a real book
                  setBookName(txt);
                }
              }}
              autoCapitalize="words"
              placeholder="Genesis"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.fieldSmall}>
          <Text style={styles.label}>Chapter</Text>
          <TextInput
            keyboardType="number-pad"
            value={String(chapter)}
            onChangeText={(v) => {
              const n = Math.max(1, parseInt(v || '1', 10));
              setChapter(isNaN(n) ? 1 : n);
            }}
            style={styles.input}
          />
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Filter in chapter</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find words in this chapter…"
            style={styles.input}
          />
        </View>
      </View>

      {/* Status */}
      {(loadingDb || loadingVerses) && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.dimText}>Loading KJV…</Text>
        </View>
      )}

      {!!error && !loadingDb && !loadingVerses && (
        <View style={styles.errorBox}>
          <Text style={styles.dimText}>{error}</Text>
          <Text style={[styles.dimText, { marginTop: 6 }]}>
            Ensure the bundled DB exists at <Text style={styles.code}>assets/bible/kjv.sqlite</Text>.
          </Text>
        </View>
      )}

      {/* Reader */}
      {!error && (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 18 }}
          data={filtered}
          keyExtractor={(item) => String(item.verse)}
          ListHeaderComponent={
            <Text style={styles.heading}>
              {bookName} {chapter}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.verseCard}>
              <Text style={styles.verseNum}>{item.verse}</Text>
              <Text style={styles.verseText}>{item.text}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

/** Styles */
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.selected, // matches your app look
  },

  controls: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: Colors.selected,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E2EB',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  field: {
    width: 170,
  },
  fieldSmall: {
    width: 100,
  },
  label: {
    fontSize: 12,
    color: '#6B6B76',
    marginBottom: 6,
    fontWeight: '600',
  },
  selectLike: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6E0',
    backgroundColor: '#FFF',
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6E0',
    backgroundColor: '#FFF',
  },

  heading: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.grey,
  },

  verseCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE6EF',
    marginBottom: 8,
  },
  verseNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '800',
    color: '#1E2027',
    backgroundColor: '#F2EEF7',
  },
  verseText: {
    flex: 1,
    color: '#1E2027',
    lineHeight: 22,
    fontSize: 16,
  },

  loading: {
    padding: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dimText: {
    color: '#6B6B76',
    fontSize: 14,
  },
  errorBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});


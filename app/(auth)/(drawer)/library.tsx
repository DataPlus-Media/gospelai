import LibraryHome from '@/components/library/LibraryHome';
import Colors from '@/constants/Colors';
import { initLibrary } from '@/utils/library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import React, { Suspense, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ParamValue = string | string[] | undefined;
type LibraryParams = { work?: string; section?: string; paragraph?: string; book?: string; chapter?: string; verse?: string; jump?: string };
const keys = ['work', 'section', 'paragraph', 'book', 'chapter', 'verse', 'jump'] as const;

export default function LibraryScreen() {
  const db = useSQLiteContext();
  return (
    <Suspense fallback={<View style={styles.loading}><Text style={styles.loadingTitle}>Opening Authors insight…</Text><View style={styles.skeleton} /><View style={styles.skeletonShort} /></View>}>
      <SQLiteProvider databaseName="library.db" onInit={initLibrary}>
        <LibraryRouteContent appDb={db} />
      </SQLiteProvider>
    </Suspense>
  );
}

// expo-sqlite memoizes its provider without comparing children. Read route
// context inside the provider so query-parameter changes still reach the UI.
function LibraryRouteContent({ appDb }: { appDb: SQLiteDatabase }) {
  const router = useRouter();
  const raw = useLocalSearchParams<LibraryParams>();
  const params = useMemo(() => {
    const values: LibraryParams = {};
    for (const key of keys) {
      const value = raw[key] as ParamValue;
      if (typeof value === 'string') values[key] = value;
      else if (Array.isArray(value)) values[key] = value[0];
    }
    return values;
  }, [raw]);
  const setParams = useCallback((next: Record<string, string | undefined>) => {
    router.setParams(next);
  }, [router]);
  return <LibraryHome appDb={appDb} params={params} setParams={setParams} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  loadingTitle: { color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  skeleton: { height: 16, width: '92%', borderRadius: 7, backgroundColor: Colors.surfaceRaised },
  skeletonShort: { height: 16, width: '62%', borderRadius: 7, backgroundColor: Colors.surface },
});

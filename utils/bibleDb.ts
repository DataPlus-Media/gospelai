import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

let opening: Promise<SQLite.SQLiteDatabase> | undefined;
export function openBibleDb(): Promise<SQLite.SQLiteDatabase> {
  if (!opening) opening = copyAndOpen().catch(error => { opening = undefined; throw error; });
  return opening;
}

async function copyAndOpen(): Promise<SQLite.SQLiteDatabase> {
  const sqliteDir = `${FileSystem.documentDirectory ?? ''}SQLite`;
  const dbPath = `${sqliteDir}/kjv.sqlite`;

  const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
  }

  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  if (!dbInfo.exists) {
    const asset = Asset.fromModule(require('../assets/bible/kjv.sqlite'));
    await asset.downloadAsync();
    const from = asset.localUri ?? asset.uri;
    if (!from) throw new Error('Unable to locate bundled kjv.sqlite asset');
    await FileSystem.copyAsync({ from, to: dbPath });
  }

  return SQLite.openDatabaseAsync('kjv.sqlite');
}

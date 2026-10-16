import { Asset } from 'expo-asset';
import * as SQLite from 'expo-sqlite';

let opening: Promise<SQLite.SQLiteDatabase> | undefined;
export function openBibleDb(): Promise<SQLite.SQLiteDatabase> {
  if (!opening) {
    opening = (async () => {
      const asset = Asset.fromModule(require('../assets/bible/kjv.sqlite'));
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Could not load the bundled KJV Bible. Please reload.');
      return SQLite.deserializeDatabaseAsync(new Uint8Array(await response.arrayBuffer()));
    })().catch(error => { opening = undefined; throw error; });
  }
  return opening;
}

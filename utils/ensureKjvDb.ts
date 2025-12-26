// utils/ensureKjvDb.ts
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

export async function ensureKjvDb(dbName: string = "kjv.sqlite"): Promise<string> {
  const FS = FileSystem as any; // 👈 bypass TS type gaps

  const sqliteDir = (FS.documentDirectory ?? "") + "SQLite";
  const target = `${sqliteDir}/${dbName}`;

  const dirInfo = await FS.getInfoAsync(sqliteDir);
  if (!dirInfo.exists) {
    await FS.makeDirectoryAsync(sqliteDir, { intermediates: true });
  }

  const dbInfo = await FS.getInfoAsync(target);
  if (dbInfo.exists) return target;

  const asset = Asset.fromModule(require("../assets/bible/kjv.sqlite"));
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error("kjv.sqlite asset missing localUri");

  await FS.copyAsync({ from: asset.localUri, to: target });
  return target;
}

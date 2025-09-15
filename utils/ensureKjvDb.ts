import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

/**
 * Copies the bundled kjv.sqlite into the app's SQLite directory on first run.
 * Returns the absolute path to the installed DB.
 */
export async function ensureKjvDb(dbName: string = "kjv.db"): Promise<string> {
  // Where Expo/SQLite looks for databases
  const sqliteDir = FileSystem.documentDirectory + "SQLite";
  const target = `${sqliteDir}/${dbName}`;

  // If it's already there, we're done
  const info = await FileSystem.getInfoAsync(target);
  if (info.exists) return target;

  // Make sure the folder exists
  await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });

  // Load the bundled asset
  const asset = Asset.fromModule(require("../assets/bible/kjv.sqlite")); // <- your file
  await asset.downloadAsync(); // ensures asset.localUri is available

  // Copy into the SQLite dir with the name we’ll open later
  await FileSystem.copyAsync({
    from: asset.localUri!,
    to: target,
  });

  return target;
}
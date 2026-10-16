import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { LibraryWork } from './libraryTypes';
import { installWork } from './library';

export type DownloadProgress = {
  phase: 'downloading' | 'installing';
  fraction: number | null;
  received: number;
  total: number;
};
let busy = false;

function downloadUrl(work: LibraryWork) {
  const path = `/library-packages/${encodeURIComponent(work.package!.revision)}/${encodeURIComponent(work.id)}.json`;
  if (Platform.OS === 'web') return path;
  const configured = process.env.EXPO_PUBLIC_LIBRARY_BASE_URL?.replace(/\/$/, '');
  if (configured) {
    if (!configured.startsWith('https://')) throw new Error('Library server must use HTTPS.');
    return configured + path;
  }
  // Expo's dev host is available on physical devices as well as simulators.
  const host = Constants.expoConfig?.hostUri;
  if (__DEV__ && host) return `http://${host}${path}`;
  throw new Error('Library downloads are not configured for this build. The app owner must set the library server URL.');
}

function receive(url: string, total: number, report: (p: DownloadProgress) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.timeout = 180000;
    xhr.onprogress = event => report({
      phase: 'downloading', fraction: total ? Math.min(event.loaded / total, 1) : null,
      received: event.loaded, total,
    });
    xhr.onerror = () => reject(new Error('Download failed. Check your connection and tap Retry. Your existing downloads are unchanged.'));
    xhr.ontimeout = () => reject(new Error('Download timed out. Please tap Retry on a stable connection.'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Download failed (${xhr.status}). Please retry.`;
        try { message = JSON.parse(xhr.responseText).error || message; } catch { /* Non-JSON server error. */ }
        reject(new Error(message));
      } else resolve(xhr.responseText);
    };
    report({ phase: 'downloading', fraction: 0, received: 0, total });
    xhr.send();
  });
}

export async function downloadWork(db: SQLiteDatabase, work: LibraryWork, report: (p: DownloadProgress) => void) {
  if (busy) throw new Error('Another library download is running. Please wait for it to finish.');
  if (!work.package || work.blocker) throw new Error(work.blocker || 'This edition is not cleared for download.');
  busy = true;
  try {
    const body = await receive(downloadUrl(work), work.package.bytes, report);
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, body);
    if (digest !== work.package.sha256) throw new Error('Download integrity check failed. Nothing was installed. Please retry.');
    let value: unknown;
    try { value = JSON.parse(body); }
    catch { throw new Error('The downloaded edition is incomplete. Nothing was installed. Please retry.'); }
    report({ phase: 'installing', fraction: 0, received: work.package.bytes, total: work.package.bytes });
    await installWork(db, work, value, fraction => report({
      phase: 'installing', fraction, received: work.package!.bytes, total: work.package!.bytes,
    }));
  } finally { busy = false; }
}

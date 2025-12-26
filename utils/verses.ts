// utils/verses.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LS_FAVS_KEY = 'fav_verses_v1';

export type FavVerse = {
  reference: string;   // e.g. "John 3:16"
  text: string;        // small snippet or ref itself
  savedAt: number;     // ms
  threadId?: string;   // use chatId string
  messageTs?: number;  // optional timestamp of the message
};

// Simple "Book 1:2" style (handles 1–3 John, etc.)
export const verseRegex =
  /\b(?:[1-3]\s)?[A-Za-z]+(?:\s(?:of|the))?\s\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?\b/g;

export const normRef = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

export async function getFavs(): Promise<FavVerse[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_FAVS_KEY);
    return raw ? (JSON.parse(raw) as FavVerse[]) : [];
  } catch {
    return [];
  }
}

export async function saveFavs(list: FavVerse[]) {
  try {
    await AsyncStorage.setItem(LS_FAVS_KEY, JSON.stringify(list));
  } catch {}
}

export async function isFavLocal(reference: string, threadId?: string) {
  const key = normRef(reference);
  const list = await getFavs();
  return !!list.find(
    f => normRef(f.reference) === key && (!threadId || f.threadId === threadId)
  );
}

export async function saveFavLocal(f: FavVerse) {
  const list = await getFavs();
  list.push(f);
  await saveFavs(list);
}

export async function removeFavLocal(reference: string, threadId?: string) {
  const key = normRef(reference);
  const list = await getFavs();
  const next = list.filter(
    f => !(normRef(f.reference) === key && (!threadId || f.threadId === threadId))
  );
  await saveFavs(next);
}

// Very light parser for "Book 3:16"
export function parseRef(ref: string) {
  const m = ref.match(/^((?:[1-3]\s)?[A-Za-z]+(?:\s(?:of|the))?)\s(\d{1,3}):(\d{1,3})/i);
  if (!m) return null;
  return { bookName: m[1], chapter: Number(m[2]), verse: Number(m[3]) };
}



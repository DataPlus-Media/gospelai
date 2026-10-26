import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { addNote, deleteNote, getNotes, type Note, updateNote } from '@/utils/Database';

type TokenProvider = () => Promise<string | null>;
type NoteInput = Pick<Note, 'content' | 'source' | 'reference'>;

const configuredBase = (Constants.expoConfig?.extra as { notesApiBase?: string } | undefined)?.notesApiBase
  || process.env.EXPO_PUBLIC_NOTES_API_BASE
  || '';
const API_BASE = Platform.OS === 'web' ? '' : configuredBase.replace(/\/+$/, '');
const ENDPOINT = `${API_BASE}/api/study-notes`;

async function request<T>(getToken: TokenProvider, path = '', init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Sign in again to access your synced notes.');
  const response = await fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Your notes could not be loaded. Please retry.');
  return result as T;
}

export async function loadStudyNotes(db: SQLiteDatabase, isSignedIn: boolean, getToken: TokenProvider) {
  if (!isSignedIn) return getNotes(db);
  const { notes } = await request<{ notes: Note[] }>(getToken);
  return notes;
}

export async function saveStudyNote(
  db: SQLiteDatabase,
  isSignedIn: boolean,
  getToken: TokenProvider,
  input: NoteInput,
  noteId?: Note['id'],
) {
  const content = input.content.trim();
  if (!content) throw new Error('Write a note before saving.');
  if (!isSignedIn) {
    if (noteId === undefined) await addNote(db, content, input.source, input.reference);
    else {
      const id = Number(noteId);
      if (!Number.isInteger(id)) throw new Error('This local note could not be edited.');
      await updateNote(db, id, content);
    }
    return;
  }
  if (noteId === undefined) {
    await request<{ note: Note }>(getToken, '', {
      method: 'POST',
      body: JSON.stringify({ content, source: input.source, reference: input.reference }),
    });
  } else {
    await request<{ note: Note }>(getToken, `/${encodeURIComponent(String(noteId))}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }
}

export async function removeStudyNote(
  db: SQLiteDatabase,
  isSignedIn: boolean,
  getToken: TokenProvider,
  noteId: Note['id'],
) {
  if (!isSignedIn) {
    const id = Number(noteId);
    if (!Number.isInteger(id)) throw new Error('This local note could not be deleted.');
    await deleteNote(db, id);
    return;
  }
  await request<{ deleted: boolean }>(getToken, `/${encodeURIComponent(String(noteId))}`, { method: 'DELETE' });
}

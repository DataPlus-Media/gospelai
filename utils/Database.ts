import { Message, Role } from '@/utils/Interfaces';
import { type SQLiteDatabase } from 'expo-sqlite';

export interface Note {
  id: number | string;
  content: string;
  source: string;
  reference: string;
  created_at: string;
  updated_at?: string;
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 3;
  let result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }
  if (currentDbVersion === 0) {
    await db.execAsync(`
PRAGMA journal_mode = 'wal';
CREATE TABLE chats (
  id INTEGER PRIMARY KEY NOT NULL, 
  title TEXT NOT NULL
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY NOT NULL, 
  chat_id INTEGER NOT NULL, 
  content TEXT NOT NULL, 
  imageUrl TEXT, 
  role TEXT, 
  prompt TEXT, 
  FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
);
`);

    currentDbVersion = 1;
  }
  if (currentDbVersion === 1) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
    currentDbVersion = 2;
  }

  if (currentDbVersion === 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reading_position (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS saved_verses (
          book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
          text TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('bookmark','highlight')),
          PRIMARY KEY (book, chapter, verse, kind)
        );
        CREATE TABLE IF NOT EXISTS reading_plan (
          id INTEGER PRIMARY KEY CHECK (id = 1), started INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS plan_completions (day INTEGER PRIMARY KEY CHECK (day BETWEEN 0 AND 6));
        PRAGMA user_version = 3;
      `);
    });
  }
}

export const addChat = async (db: SQLiteDatabase, title: string) => {
  return await db.runAsync('INSERT INTO chats (title) VALUES (?)', title);
};

export const getChats = async (db: SQLiteDatabase) => {
  return await db.getAllAsync('SELECT * FROM chats');
};

export const getMessages = async (db: SQLiteDatabase, chatId: number): Promise<Message[]> => {
  return (await db.getAllAsync<Message>('SELECT * FROM messages WHERE chat_id = ? ORDER BY id', chatId)).map(
    (message) => ({
      ...message,
      role: '' + message.role === 'bot' ? Role.Bot : Role.User,
    })
  );
};

export const addMessage = async (
  db: SQLiteDatabase,
  chatId: number,
  { content, role, imageUrl, prompt }: Message
) => {
  return await db.runAsync(
    'INSERT INTO messages (chat_id, content, role, imageUrl, prompt) VALUES (?, ?, ?, ?, ?)',
    chatId,
    content,
    role === Role.Bot ? 'bot' : 'user',
    imageUrl || '',
    prompt || ''
  );
};

export const deleteChat = async (db: SQLiteDatabase, chatId: number) => {
  return await db.runAsync('DELETE FROM chats WHERE id = ?', chatId);
};

export const renameChat = async (db: SQLiteDatabase, chatId: number, title: string) => {
  return await db.runAsync('UPDATE chats SET title = ? WHERE id = ?', title, chatId);
};

export const addNote = async (
  db: SQLiteDatabase,
  content: string,
  source: string,
  reference: string = ''
) => {
  return await db.runAsync(
    "INSERT INTO notes (content, source, reference, created_at) VALUES (?, ?, ?, datetime('now'))",
    content,
    source,
    reference
  );
};

export const updateNote = async (db: SQLiteDatabase, noteId: number, content: string) => {
  return await db.runAsync('UPDATE notes SET content = ? WHERE id = ?', content, noteId);
};

export const getNotes = async (db: SQLiteDatabase): Promise<Note[]> => {
  return await db.getAllAsync<Note>('SELECT * FROM notes ORDER BY created_at DESC');
};

export const deleteNote = async (db: SQLiteDatabase, noteId: number) => {
  return await db.runAsync('DELETE FROM notes WHERE id = ?', noteId);
};

import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'gAIVersion',
});

export const keyStorage = new MMKV({
  id: 'gAIkey',
});

export const chatStorage = new MMKV({
  id: 'chats',
});
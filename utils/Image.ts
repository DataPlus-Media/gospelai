import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// Use `as any` so TS stops complaining about documentDirectory typing
const fsAny = FileSystem as any;

const getDocumentDir = (): string => {
  return (fsAny.documentDirectory || fsAny.cacheDirectory || '') as string;
};

// Download image to app storage and save to Photos
export const downloadAndSaveImage = async (imageUrl: string) => {
  const fileUri = `${getDocumentDir()}${Date.now()}.jpg`;

  try {
    // Call through `fsAny` to avoid deprecated-overload warning
    const res = await fsAny.downloadAsync(imageUrl, fileUri);
    return saveFile(res.uri);
  } catch (err) {
    console.log('FS download error:', err);
  }
};

const saveFile = async (fileUri: string) => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status === 'granted') {
    try {
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      const album = await MediaLibrary.getAlbumAsync('Download');

      if (album == null) {
        await MediaLibrary.createAlbumAsync('Download', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      Alert.alert('Image saved to Photos');
    } catch (err) {
      console.log('Save error:', err);
    }
  } else if (status === 'denied') {
    Alert.alert('Please allow permissions to save images');
  }
};

// Copy image as base64 to clipboard
export const copyImageToClipboard = async (imageUrl: string) => {
  const fileUri = `${getDocumentDir()}${Date.now()}.jpg`;

  try {
    const res = await fsAny.downloadAsync(imageUrl, fileUri);

    // Use 'base64' as a literal, and go through fsAny to avoid deprecation typing
    const base64 = await fsAny.readAsStringAsync(res.uri, {
      encoding: 'base64',
    });

    await Clipboard.setImageAsync(base64);
  } catch (err) {
    console.log('Clipboard error:', err);
  }
};

export const shareImage = async (imageUrl: string) => {
  try {
    await Sharing.shareAsync(imageUrl);
  } catch (err) {
    console.log('Share error:', err);
  }
};
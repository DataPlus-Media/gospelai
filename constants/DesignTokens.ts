import { Platform } from 'react-native';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  caption: 11,
  body: 14,
  reading: 17,
  readingLineHeight: 28,
  title: 28,
} as const;

// Georgia is available on Apple platforms and browsers; Android uses its
// bundled serif family so Scripture never falls back to an unavailable font.
export const scriptureFontFamily = Platform.select({
  ios: 'Georgia',
  web: 'Georgia, serif',
  android: 'serif',
  default: 'serif',
});

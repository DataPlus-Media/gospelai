import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import MarketingSite from '@/components/marketing/MarketingSite';

export default function AuthorsInsightRoute() {
  return Platform.OS === 'web' ? (
    <MarketingSite page="authors" />
  ) : (
    <Redirect href="/" />
  );
}

import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import MarketingSite from '@/components/marketing/MarketingSite';

export default function SupportRoute() {
  return Platform.OS === 'web' ? (
    <MarketingSite page="support" />
  ) : (
    <Redirect href="/" />
  );
}

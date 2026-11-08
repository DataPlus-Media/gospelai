import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import MarketingSite from '@/components/marketing/MarketingSite';

export default function FeaturesRoute() {
  return Platform.OS === 'web' ? (
    <MarketingSite page="features" />
  ) : (
    <Redirect href="/" />
  );
}

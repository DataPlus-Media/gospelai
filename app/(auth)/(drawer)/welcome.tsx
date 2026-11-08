import { NativeWelcome } from '../../index';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

export default function Welcome() {
  if (Platform.OS === 'web') return <Redirect href="/" />;
  return <NativeWelcome />;
}

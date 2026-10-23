import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { entryRedirect } from '@/utils/navigation';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const tokenCache = {
  async getToken(key: string) {
    try {
      return Platform.OS === 'web' ? null : await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      if (Platform.OS !== 'web') await SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    const first: string | undefined = (segments as string[])[0];
    const destination = entryRedirect(isLoaded, isSignedIn, first);
    if (destination) router.replace(destination);
  }, [isLoaded, isSignedIn, segments, router]);

  if (!loaded || !isLoaded) {
    return <Slot />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Screen
        name="login"
        options={{
          presentation: 'modal',
          title: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#101C17' },
          headerTintColor: '#A8C6AE',
          contentStyle: { backgroundColor: '#101C17' },
          headerTitleStyle: { fontFamily: 'mon-sb', color: '#F4F1E8' },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close sign-in"
              hitSlop={10}
            >
              <Ionicons name="close-outline" size={28} color="#A8C6AE" />
            </TouchableOpacity>
          ),
        }}
      />

      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
};

const RootLayoutNav = () => {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <InitialLayout />
      </GestureHandlerRootView>
    </ClerkProvider>
  );
};

export default RootLayoutNav;

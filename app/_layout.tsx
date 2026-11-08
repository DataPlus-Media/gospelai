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

Stephen Omitogun
08:35
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import MarketingSite from '@/components/marketing/MarketingSite';

export default function AskRoute() {
  return Platform.OS === 'web' ? (
    <MarketingSite page="ask" />
  ) : (
    <Redirect href="/" />
  );
}

Stephen Omitogun
08:37
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

Stephen Omitogun
08:39
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

Stephen Omitogun
08:46
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { entryRedirect } from '@/utils/navigation';
import Colors from '@/constants/Colors';

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
    const destination = entryRedirect(isLoaded, isSignedIn, first, Platform.OS === 'web');
    if (destination) router.replace(destination);
  }, [isLoaded, isSignedIn, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {Platform.OS === 'web' && <Stack.Screen name="features" options={{ headerShown: false }} />}
      {Platform.OS === 'web' && <Stack.Screen name="ask" options={{ headerShown: false }} />}
      {Platform.OS === 'web' && <Stack.Screen name="authors-insight" options={{ headerShown: false }} />}
      {Platform.OS === 'web' && <Stack.Screen name="support" options={{ headerShown: false }} />}

      <Stack.Screen
        name="login"
        options={{
          presentation: 'modal',
          title: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.coral,
          contentStyle: { backgroundColor: Colors.background },
          headerTitleStyle: { fontFamily: 'mon-sb', color: Colors.text },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close sign-in"
              hitSlop={10}
            >
              <Ionicons name="close-outline" size={28} color={Colors.coral} />
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
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
      experimental={{ rethrowOfflineNetworkErrors: true }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <InitialLayout />
      </GestureHandlerRootView>
    </ClerkProvider>
  );
};

export default RootLayoutNav;

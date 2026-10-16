// app/(auth)/layout.tsx
import React, { Suspense } from 'react';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '@/utils/Database';
import LocalDatabaseBoundary from '@/components/LocalDatabaseBoundary';

export default function AuthLayout() {
  const router = useRouter();

  return (
    <LocalDatabaseBoundary>
    <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#0b0b10', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#20AB6E" /><Text style={{ color: '#fff', margin: 16 }}>Opening your local study…</Text></View>}>
    <SQLiteProvider databaseName="chat.db" onInit={migrateDbIfNeeded} useSuspense>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.selected },
        }}
      >
        {/* Drawer navigator (chat, bible, etc.) */}
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />

        {/* Settings modal */}
        <Stack.Screen
          name="(modal)/settings"
          options={{
            presentation: 'modal',
            title: 'Settings',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.selected },
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Close">
                <Ionicons name="close-outline" size={28} color="#8E8E93" />
              </TouchableOpacity>
            ),
          }}
        />

        {/* Fullscreen image viewer */}
        <Stack.Screen
          name="(modal)/image/[url]"
          options={{
            presentation: 'fullScreenModal',
            headerTransparent: true,
            headerTitle: '',
            headerShadowVisible: false,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Close image">
                <Ionicons name="close-outline" size={32} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />

        {/* Purchase/paywall removed (no RevenueCat). If you still keep the file, uncomment: */}
        {/*
        <Stack.Screen
          name="(modal)/purchase"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        */}
      </Stack>
    </SQLiteProvider>
    </Suspense>
    </LocalDatabaseBoundary>
  );
}

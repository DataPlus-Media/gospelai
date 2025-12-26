// app/(auth)/layout.tsx
import React from 'react';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '@/utils/Database';

export default function AuthLayout() {
  const router = useRouter();

  return (
    <SQLiteProvider databaseName="chat.db" onInit={migrateDbIfNeeded}>
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
  );
}

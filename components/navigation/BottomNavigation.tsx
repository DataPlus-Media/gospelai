import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const destinations = [
  { label: 'Today', path: '/today', href: '/(auth)/(drawer)/today', icon: 'home-outline' },
  { label: 'Bible', path: '/bible', href: '/(auth)/(drawer)/bible', icon: 'book-outline' },
  { label: 'Ask GospelAI', path: '/new', href: '/(auth)/(drawer)/(chat)/new', icon: 'sparkles-outline' },
  { label: 'Saved', path: '/saved', href: '/(auth)/(drawer)/saved', icon: 'bookmark-outline' },
] as const;

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Conversation detail routes also belong to Ask GospelAI.
  const isChat = pathname === '/new' || /^\/(?:\(chat\)\/)?\d+$/.test(pathname);

  return (
    <View
      accessibilityLabel="Main navigation"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), paddingLeft: insets.left, paddingRight: insets.right }]}
    >
      <View style={styles.items}>
        {destinations.map(item => {
          const selected = item.path === '/new' ? isChat : pathname === item.path;
          return (
            <Pressable
              key={item.path}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              {...(Platform.OS === 'web' ? { 'aria-current': selected ? 'page' : undefined } : {})}
              onPress={() => {
                if (selected) return;
                Keyboard.dismiss();
                router.navigate(item.href);
              }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Ionicons name={item.icon} size={21} color={selected ? '#AAE5DE' : '#9BB0B4'} accessible={false} />
              <Text style={[styles.label, selected && styles.selected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MainScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>{children}</View>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
  bar: { backgroundColor: '#101F22', borderTopWidth: 1, borderTopColor: '#2D464B', paddingTop: 6 },
  items: { width: '100%', maxWidth: 860, alignSelf: 'center', flexDirection: 'row' },
  item: { flex: 1, minHeight: 58, minWidth: 44, paddingVertical: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', gap: 5 },
  label: { fontSize: 11, lineHeight: 16, color: '#9BB0B4', textAlign: 'center' },
  selected: { color: '#AAE5DE', fontWeight: '700' },
  pressed: { opacity: 0.7 },
});

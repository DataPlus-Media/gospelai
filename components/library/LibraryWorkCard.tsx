import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LibraryWork } from '@/utils/libraryTypes';

const palette = {
  ink: '#F5F1E8',
  muted: '#9B9AA2',
  gold: '#D4B65F',
  green: '#80C59A',
  panel: '#121318',
  line: '#292A30',
};

export default function LibraryWorkCard({
  work,
  installed,
  onPress,
}: {
  work: LibraryWork;
  installed: boolean;
  onPress: () => void;
}) {
  const locked = !!(work.blocker || work.appAccessBlocker);
  return (
    <Pressable
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={`${work.title}, by ${work.author}${installed ? ', downloaded' : ''}${locked ? ', unavailable' : ''}`}
      accessibilityState={{ disabled: locked }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && !locked && styles.pressed]}
    >
      <View style={styles.index}>
        <Ionicons name={work.kind === 'commentary' ? 'book-outline' : 'sunny-outline'} size={20} color={palette.gold} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.author}>{work.author.toUpperCase()}</Text>
        <Text style={styles.title}>{work.title}</Text>
        <Text style={styles.meta}>{work.kind === 'commentary' ? 'COMMENTARY' : work.kind.toUpperCase()}</Text>
      </View>
      <View style={styles.trailing}>
        {locked ? (
          <Ionicons name="lock-closed-outline" size={16} color="#A99B8B" />
        ) : installed ? (
          <View style={styles.offline}><Ionicons name="checkmark" size={12} color={palette.green} /><Text style={styles.offlineText}>OFFLINE</Text></View>
        ) : (
          <Ionicons name="arrow-forward" size={17} color={palette.muted} />
        )}
        <Ionicons name="chevron-forward" size={15} color="#65666D" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 84, backgroundColor: palette.panel, borderWidth: 1, borderColor: palette.line, borderRadius: 16 },
  index: { height: 42, width: 42, borderRadius: 13, backgroundColor: '#28231A', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  author: { color: '#A9C5AE', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: palette.ink, fontWeight: '700', fontSize: 15, marginTop: 4, letterSpacing: -0.2 },
  meta: { color: '#898991', fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 5 },
  trailing: { alignItems: 'flex-end', justifyContent: 'space-between', height: 47 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  offlineText: { color: palette.green, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  pressed: { opacity: 0.7 },
});

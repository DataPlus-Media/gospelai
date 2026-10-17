import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LibraryWork } from '@/utils/libraryTypes';
import type { CatalogState } from './PassageTypes';
import { C, styles } from './PassageStyles';

export default function PassageCatalogRow({
  work,
  state,
  onOpen,
}: {
  work: LibraryWork;
  state: CatalogState;
  onOpen: () => void;
}) {
  const status = state === 'rights'
    ? 'Rights blocked'
    : state === 'download'
      ? 'Not downloaded'
      : 'No verified mapping';
  const description = state === 'rights'
    ? work.blocker ?? 'This edition cannot currently be redistributed.'
    : state === 'download'
      ? 'This commentary is not installed on this device. A matching section may be available after a permitted download.'
      : 'Downloaded, but this passage has no verified verse mapping in the installed text.';
  const tint = state === 'rights' ? C.red : state === 'unmapped' ? C.gold : C.green;
  return (
    <View style={styles.catalogRow}>
      <View style={styles.catalogRowTop}>
        <View style={styles.catalogCopy}>
          <Text style={styles.catalogAuthor}>{work.author}</Text>
          <Text selectable style={styles.catalogWork}>{work.title}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: state === 'rights' ? '#53342D' : '#4A432D' }]}>
          <Text style={[styles.statusText, { color: tint }]}>{status}</Text>
        </View>
      </View>
      <Text style={styles.catalogDescription}>{description}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open catalog details for ${work.title}`} onPress={onOpen} style={styles.catalogAction}>
        <Text style={styles.catalogActionText}>{state === 'download' ? 'View work and download options' : 'View work details'}</Text>
        <Ionicons name="arrow-forward" size={14} color={C.green} />
      </Pressable>
    </View>
  );
}

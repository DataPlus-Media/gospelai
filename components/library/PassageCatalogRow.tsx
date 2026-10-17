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
  chapterLabel,
}: {
  work: LibraryWork;
  state: CatalogState;
  onOpen: () => void;
  chapterLabel?: string;
}) {
  const hasChapterCommentary = state === 'download' && !!chapterLabel;
  const status = state === 'rights'
    ? 'Rights blocked'
    : state === 'download'
      ? hasChapterCommentary
        ? 'Available chapter commentary · download required'
        : 'Not downloaded'
      : state === 'incomplete'
        ? 'Incomplete download'
        : 'No verified mapping';
  const description = state === 'rights'
    ? work.blocker ?? 'This edition cannot currently be redistributed.'
    : state === 'download'
      ? hasChapterCommentary
        ? `Henry's commentary covers ${chapterLabel} as a chapter, not as verse-specific commentary.`
        : 'This commentary is not installed on this device. Download the work to read it offline.'
      : state === 'incomplete'
        ? 'This download is incomplete. Repair replaces the source text only; your notes and reading position are retained.'
        : 'Downloaded, but this passage has no verified verse mapping in the installed text.';
  const tint = state === 'rights'
    ? C.red
    : state === 'download'
      ? C.green
      : state === 'incomplete' || state === 'unmapped'
        ? C.gold
        : C.green;
  const bytes = Number(work.package?.bytes);
  const sizeLabel = Number.isFinite(bytes) && bytes > 0
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : null;
  const actionLabel = state === 'download'
    ? 'Download commentary'
    : state === 'incomplete'
      ? 'Repair download'
      : 'View work details';
  const actionable = state === 'download' || state === 'incomplete';
  const action = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${actionLabel} for ${work.title}`}
      onPress={onOpen}
      style={[styles.catalogAction, hasChapterCommentary && styles.catalogActionPrimary]}
    >
      <Text style={[styles.catalogActionText, hasChapterCommentary && styles.catalogActionPrimaryText]}>{actionLabel}</Text>
      <Ionicons name="arrow-forward" size={14} color={hasChapterCommentary ? '#10231B' : C.green} />
    </Pressable>
  );
  const badge = <View style={[styles.statusBadge, { borderColor: state === 'rights' ? '#53342D' : state === 'incomplete' ? '#51472D' : '#4A432D', alignSelf: 'flex-start' }]}>
    <Text style={[styles.statusText, { color: tint }]}>{status}</Text>
  </View>;
  return (
    <View style={styles.catalogRow}>
      <View style={styles.catalogRowTop}>
        <View style={styles.catalogCopy}>
          <Text style={styles.catalogAuthor}>{work.author}</Text>
          <Text selectable style={styles.catalogWork}>{work.title}</Text>
        </View>
        {actionable ? action : badge}
      </View>
      {actionable ? badge : null}
      <Text style={styles.catalogDescription}>{description}</Text>
      {hasChapterCommentary ? (
        <View style={styles.catalogDownloadInfo}>
          {sizeLabel ? <Text style={styles.catalogDownloadSize}>Full work · {sizeLabel}</Text> : null}
          <Text style={styles.catalogOfflineBenefit}>Download once to keep the commentary available offline.</Text>
        </View>
      ) : null}
      {!actionable ? action : null}
    </View>
  );
}

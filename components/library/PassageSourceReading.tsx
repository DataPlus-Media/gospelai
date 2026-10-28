import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LibraryWork, PassageMatch } from '@/utils/libraryTypes';
import type { LoadedSource } from './PassageTypes';
import { C, styles } from './PassageStyles';
import { readerFriendlySourceNotice } from '@/utils/insight';

export default function PassageSourceReading({
  work,
  row,
  loaded,
  onAsk,
  onOpenLink,
}: {
  work: LibraryWork;
  row: PassageMatch;
  loaded: LoadedSource;
  onAsk: () => void;
  onOpenLink: (url: string) => void;
}) {
  return (
    <View>
      <View style={styles.provenance}>
        <Text style={styles.metaLabel}>AUTHOR & CONTRIBUTORS</Text>
        <Text selectable style={styles.metaText}>{loaded.content.attribution}</Text>
        <Text style={styles.metaLabel}>EDITION</Text>
        <Text selectable style={styles.metaText}>{work.edition}</Text>
        <Text style={styles.metaLabel}>SECTION SOURCE</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="Open source edition" onPress={() => onOpenLink(loaded.content.source_url)}>
          <Text selectable style={styles.urlText}>{loaded.content.source_url}</Text>
        </Pressable>
        <Text style={styles.metaLabel}>SHARING DETAILS</Text>
        <Text selectable style={styles.metaText}>{work.rights}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="View source sharing details" onPress={() => onOpenLink(work.rightsUrl)}>
          <Text style={styles.urlText}>View source details</Text>
        </Pressable>
      </View>
      {loaded.notices.length > 0 ? (
        <View style={styles.noticePanel}>
          <Text style={styles.noticeTitle}>ABOUT THIS EDITION</Text>
          {loaded.notices.map((notice, index) => <Text selectable key={`${index}:${notice}`} style={styles.noticeText}>{readerFriendlySourceNotice(notice)}</Text>)}
        </View>
      ) : null}
      <View style={styles.fullTextHeader}>
        <Text style={styles.fullTextTitle}>{loaded.content.title || row.title}</Text>
        <Text style={styles.paragraphCount}>{loaded.content.paragraphs.length} {loaded.content.paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}</Text>
      </View>
      {loaded.content.paragraphs.map((paragraph, index) => (
        <Text selectable key={`${paragraph.paragraph}:${index}`} style={styles.fullParagraph}>{paragraph.text}</Text>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask GospelAI about this source"
        onPress={onAsk}
        style={styles.askButton}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.gold} />
        <Text style={styles.askButtonText}>Ask GospelAI about this source</Text>
      </Pressable>
    </View>
  );
}

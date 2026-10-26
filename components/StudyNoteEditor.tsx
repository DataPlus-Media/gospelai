import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function StudyNoteEditor({
  visible,
  reference,
  scriptureText,
  initialContent = '',
  isEditing = false,
  onClose,
  onSave,
}: {
  visible: boolean;
  reference?: string;
  scriptureText?: string;
  initialContent?: string;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setContent(initialContent);
      setError('');
    }
  }, [initialContent, visible]);

  const save = async () => {
    if (!content.trim()) {
      setError('Write a note before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(content.trim());
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your note could not be saved. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>{isEditing ? 'YOUR REFLECTION' : 'NEW REFLECTION'}</Text>
            <Text style={s.title}>{isEditing ? 'Edit note' : 'Save a note'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close note editor" onPress={onClose} style={s.close}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {reference ? <Text style={s.reference}>{reference} · KJV</Text> : null}
          {scriptureText ? <Text selectable style={s.scripture}>{`“${scriptureText}”`}</Text> : null}
          <Text style={s.label}>Your note</Text>
          <TextInput
            accessibilityLabel="Your note"
            value={content}
            onChangeText={setContent}
            placeholder="Write a reflection or question…"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={10_000}
            textAlignVertical="top"
            style={s.input}
          />
          <Text style={s.counter}>{content.length.toLocaleString()} / 10,000</Text>
          {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saving ? 'Saving note' : isEditing ? 'Save note changes' : 'Save note'}
            disabled={saving}
            onPress={() => void save()}
            style={[s.save, saving && s.disabled]}
          >
            {saving ? <ActivityIndicator color={Colors.onCoral} /> : <Text style={s.saveText}>{isEditing ? 'Save changes' : 'Save note'}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 72, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: Colors.coralSoft, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: Colors.text, fontSize: 21, fontWeight: '700', marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 18, paddingBottom: 40 },
  reference: { color: Colors.coralSoft, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  scripture: { color: Colors.textMuted, fontSize: 15, lineHeight: 23, marginBottom: 22 },
  label: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { minHeight: 180, padding: 14, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 14, backgroundColor: Colors.surface, color: Colors.text, fontSize: 16, lineHeight: 24 },
  counter: { color: Colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 6 },
  error: { color: Colors.coralSoft, marginTop: 12, lineHeight: 19 },
  save: { minHeight: 48, marginTop: 18, borderRadius: 12, backgroundColor: Colors.coral, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: Colors.onCoral, fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.6 },
});

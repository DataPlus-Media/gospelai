import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export default class LocalDatabaseBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={{ flex: 1, backgroundColor: '#0b0b10', padding: 24, justifyContent: 'center', gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Local study could not open</Text>
      <Text style={{ color: '#b8bcc7', lineHeight: 24 }}>
        {Platform.OS === 'web'
          ? 'Close any other GospelAI tabs, then retry. Your saved data has not been cleared. This browser needs cross-origin isolation and local storage access for SQLite.'
          : 'Close and reopen GospelAI to retry. Your saved data has not been cleared. Check that your device has available storage.'}
      </Text>
      {Platform.OS === 'web' && <Pressable accessibilityRole="button" onPress={() => window.location.reload()} style={{ backgroundColor: '#20AB6E', padding: 16, borderRadius: 12 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Retry opening local study</Text>
      </Pressable>}
    </View>;
  }
}

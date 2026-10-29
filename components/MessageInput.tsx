import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ATouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export type Props = {
  onShouldSend: (message: string) => Promise<boolean>;
  onNewChat?: () => void; // new optional callback
  draft?: string;
  draftId?: string;
  disabled?: boolean;
};


const MessageInput = ({ onShouldSend, onNewChat, draft, draftId, disabled }: Props) => {
  const [message, setMessage] = useState('');
  useEffect(() => { setMessage(draft || ''); }, [draft, draftId]);
  const { bottom } = useSafeAreaInsets();
  const expanded = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<TextInput>(null);

  const expandItems = () => {
    expanded.value = withTiming(1, { duration: reducedMotion ? 0 : 400 });
  };

  const collapseItems = () => {
    expanded.value = withTiming(0, { duration: reducedMotion ? 0 : 400 });
  };

  const expandButtonStyle = useAnimatedStyle(() => {
    const opacityInterpolation = interpolate(expanded.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    const widthInterpolation = interpolate(expanded.value, [0, 1], [44, 0], Extrapolation.CLAMP);
    return { opacity: opacityInterpolation, width: widthInterpolation };
  });

  const buttonViewStyle = useAnimatedStyle(() => {
    const widthInterpolation = interpolate(expanded.value, [0, 1], [0, 100], Extrapolation.CLAMP);
    return { width: widthInterpolation, opacity: expanded.value };
  });

  const onChangeText = (text: string) => {
    collapseItems();
    setMessage(text);
  };

  const sending = useRef(false);
  const onSend = async () => {
    const text = message.replace(/\s*\n+\s*/g, ' ').trim();
    if (!text || disabled || sending.current) return;
    sending.current = true;
    try { if (await onShouldSend(text)) setMessage(''); }
    finally { sending.current = false; }
  };

  return (
    <BlurView
      intensity={Platform.OS === 'web' ? 0 : 90}
      tint="dark"
      style={[{ paddingBottom: bottom, paddingTop: 10 }, Platform.OS === 'web' && styles.webBlur]}
    >
      <View style={[
        styles.row,
        Platform.OS === 'ios' && styles.iosRow,
        Platform.OS === 'web' && styles.webRow,
      ]}>
        <ATouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="More chat options"
          onPress={expandItems}
          style={[
            styles.roundBtn,
            Platform.OS === 'ios' && styles.iosRoundBtn,
            expandButtonStyle,
          ]}
        >
          <Ionicons name="add" size={24} color={Colors.coral} />
        </ATouchableOpacity>

        {/* Animated area: now just "New chat" */}
        <Animated.View style={[styles.buttonView, buttonViewStyle]}>
          <TouchableOpacity
            style={styles.newChatBtn}
            disabled={disabled}
            onPress={() => {
              collapseItems();
              onNewChat?.();
            }}
          >
            <Ionicons name="create-outline" size={18} color="#F4F0EB" />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          ref={inputRef}
          placeholder="Write a message"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Write a message"
          autoFocus={false}
          editable={!disabled}
          style={[
            styles.messageInput,
            Platform.OS === 'ios' && styles.iosMessageInput,
          ]}
          onFocus={collapseItems}
          onChangeText={onChangeText}
          value={message}
          multiline
        />

        {message.length > 0 ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send message" disabled={disabled} onPress={onSend} style={{ padding: 10, opacity: disabled ? 0.4 : 1 }}>
            <Ionicons name="arrow-up-circle" size={24} color={Colors.coral} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity>
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iosRow: {
    paddingHorizontal: 16,
  },
  webBlur: {
    width: '100%',
  },
  webRow: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  messageInput: {
    flex: 1,
    marginHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 10,
    color: Colors.header_txt,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  iosMessageInput: {
    minHeight: 48,
    maxHeight: 120,
    marginHorizontal: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 16,
    lineHeight: 20,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 20,
    backgroundColor: Colors.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosRoundBtn: {
    borderRadius: 22,
  },
  buttonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newChatBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  newChatText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessageInput;

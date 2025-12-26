import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ATouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export type Props = {
  onShouldSend: (message: string) => void;
  onNewChat?: () => void; // new optional callback
};


const MessageInput = ({ onShouldSend, onNewChat }: Props) => {
  const [message, setMessage] = useState('');
  const { bottom } = useSafeAreaInsets();
  const expanded = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const expandItems = () => {
    expanded.value = withTiming(1, { duration: 400 });
  };

  const collapseItems = () => {
    expanded.value = withTiming(0, { duration: 400 });
  };

  const expandButtonStyle = useAnimatedStyle(() => {
    const opacityInterpolation = interpolate(expanded.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    const widthInterpolation = interpolate(expanded.value, [0, 1], [30, 0], Extrapolation.CLAMP);
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

  const onSend = () => {
    const text = message.replace(/\s*\n+\s*/g, ' ').trim();
    if (!text) return;

    onShouldSend(text);
    setMessage('');
  };

  return (
    <BlurView intensity={90} tint="dark" style={{ paddingBottom: bottom, paddingTop: 10 }}>
      <View style={styles.row}>
        <ATouchableOpacity onPress={expandItems} style={[styles.roundBtn, expandButtonStyle]}>
          <Ionicons name="add" size={24} color={Colors.grey} />
        </ATouchableOpacity>

        {/* Animated area: now just "New chat" */}
        <Animated.View style={[styles.buttonView, buttonViewStyle]}>
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => {
              collapseItems();
              onNewChat?.();
            }}
          >
            <Ionicons name="create-outline" size={18} color="#f3f4f6" />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          autoFocus
          ref={inputRef}
          placeholder="Message GospelAI"
          style={styles.messageInput}
          onFocus={collapseItems}
          onChangeText={onChangeText}
          value={message}
          multiline
        />

        {message.length > 0 ? (
          <TouchableOpacity onPress={onSend}>
            <Ionicons name="arrow-up-circle" size={24} color={Colors.header_txt} />
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
  messageInput: {
    flex: 1,
    marginHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 10,
    color: Colors.header_txt,
    borderColor: Colors.greyLight,
    backgroundColor: Colors.header_bg,
  },
  roundBtn: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: Colors.search_input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#171922',
    borderWidth: 1,
    borderColor: '#262a36',
  },
  newChatText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessageInput;

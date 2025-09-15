import Colors from '@/constants/Colors';
import { memo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,                 
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ReText } from 'react-native-redash';
import * as Haptics from 'expo-haptics';      

// soft “candle” pulse: a few gentle taps with slight deviation
function candleHaptics() {
  // light impact, tiny stagger to feel organic
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setTimeout(() => Haptics.selectionAsync(), 30 + Math.random() * 30);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 80 + Math.random() * 40);
}

// center “settle” pulse: a single medium tap
function centerHaptics() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// Content array with title, background color, and font color
const content = [
  { title: 'Scripture meets AI.',       bg: Colors.deep_navy,  fontColor: Colors.pink  },
  { title: 'Ask. Learn. Grow',          bg: Colors.slate,  fontColor: Colors.sky   },
  { title: 'Grow in the Word',          bg: Colors.green, fontColor: Colors.yellow  },
  { title: "Let's discover.",           bg: Colors.plum,   fontColor: Colors.light},
  { title: 'GospelAI.',                 bg: Colors.teal,  fontColor: Colors.blue  },
];

const AnimatedIntro = () => {
  // Get screen width
  const { width } = useWindowDimensions();
  const ballWidth = 34;
  const half = width / 2 - ballWidth / 2; // center position for the ball

  // Shared animated values
  const currentX = useSharedValue(half);       // Ball X position
  const currentIndex = useSharedValue(0);      // Which content index is active
  const isAtStart = useSharedValue(true);      // If ball is at start of animation
  const labelWidth = useSharedValue(0);        // Width of text label
  const canGoToNext = useSharedValue(false);   // Controls looping between items
  const didPlay = useSharedValue(false);       // Prevents re-triggering prematurely

  // Determine the next color index
  const newColorIndex = useDerivedValue(() => {
    if (!isAtStart.value) {
      return (currentIndex.value + 1) % content.length;
    }
    return currentIndex.value;
  }, [currentIndex]);

  // Animated text style: color + sliding motion
  const textStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        currentX.value,
        [half, half + labelWidth.value / 2],
        [content[newColorIndex.value].fontColor, content[currentIndex.value].fontColor],
        'RGB'
      ),
      transform: [
        {
          translateX: interpolate(
            currentX.value,
            [half, half + labelWidth.value / 2],
            [half + 4, half - labelWidth.value / 2] // text shifts as ball moves
          ),
        },
      ],
    };
  }, [currentIndex, currentX]);

  // Animated ball (circle) style
  const ballStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        currentX.value,
        [half, half + labelWidth.value / 2],
        [content[newColorIndex.value].fontColor, content[currentIndex.value].fontColor],
        'RGB'
      ),
      transform: [{ translateX: currentX.value }],
    };
  });

  // Background "mask" style (rectangular area behind text)
  const mask = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        currentX.value,
        [half, half + labelWidth.value / 2],
        [content[newColorIndex.value].bg, content[currentIndex.value].bg],
        'RGB'
      ),
      transform: [{ translateX: currentX.value }],
      width: width / 1.5,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
    }),
    [currentIndex, currentX, labelWidth]
  );

  // Fading + sliding background transition
  const style1 = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      currentX.value,
      [half, half + labelWidth.value / 2],
      [content[newColorIndex.value].bg, content[currentIndex.value].bg],
      'RGB'
    ),
    opacity: interpolate(1, [1, 0], [1, 0, 0, 0, 0, 0, 0]),
    transform: [
      {
        translateX: interpolate(1, [1, 0], [0, -width * 2, -width, -width, -width, -width, -width]),
      },
    ],
  }));

  // Animated derived text (current title)
  const text = useDerivedValue(() => content[currentIndex.value].title, [currentIndex]);

  // First reaction: moves ball to right after text width is known
  useAnimatedReaction(
    () => labelWidth.value,
    (newWidth) => {
      currentX.value = withDelay(
        1000,
        withTiming(
          half + newWidth / 2,
          { duration: 800 },
          (finished) => {
            if (finished) {
              // 👇 trigger gentle “candle” haptics when reaching the right
              runOnJS(candleHaptics)();
              canGoToNext.value = true;
              isAtStart.value = false;
            }
          }
        )
      );
    },
    [labelWidth, currentX, half]
  );

  // Second reaction: moves ball back left and cycles to next text
  useAnimatedReaction(
    () => canGoToNext.value,
    (next) => {
      if (next) {
        canGoToNext.value = false;
        currentX.value = withDelay(
          1000,
          withTiming(
            half,
            { duration: 800 },
            (finished) => {
              if (finished) {
                // 👇 a slightly stronger tap when it settles back to center
                runOnJS(centerHaptics)();
                currentIndex.value = (currentIndex.value + 1) % content.length;
                isAtStart.value = true;
                didPlay.value = false;
              }
            }
          )
        );
      }
    },
    [currentX, labelWidth]
  );

  // Render animated intro
  return (
    <Animated.View style={[styles.wrapper, style1]}>
      <Animated.View style={[styles.content]}>
        <Animated.View style={[styles.ball, ballStyle]} />
        <Animated.View style={[styles.mask, mask]} />
        <ReText
          onLayout={(e) => {
            // Store text width so animation knows how far to move
            labelWidth.value = e.nativeEvent.layout.width + 4;
          }}
          style={[styles.title, textStyle]}
          text={text}
        />
      </Animated.View>
    </Animated.View>
  );
};

// Styles for static layout
const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  mask: {
    zIndex: 1,
    position: 'absolute',
    left: '0%',
    height: 44,
  },
  ball: {
    width: 40,
    zIndex: 10,
    height: 40,
    backgroundColor: '#000',
    borderRadius: 20,
    position: 'absolute',
    left: '0%',
  },
  titleText: { flexDirection: 'row' },
  title: {
    fontSize: 36,
    fontWeight: '600',
    left: '0%',
    position: 'absolute',
  },
  content: { marginTop: 300 },
});

export default memo(AnimatedIntro);

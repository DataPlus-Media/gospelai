import Colors from '@/constants/Colors';
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Idea = { title: string; text: string };

type Props = {
  onSelectCard: (message: string) => void;
  ideas?: Idea[];
  loading?: boolean;
};

const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
    </Animated.View>
  );
};

const MessageIdeas = ({ onSelectCard, ideas, loading }: Props) => {
  if (loading) {
    return (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
      </View>
    );
  }

  const items = ideas && ideas.length > 0 ? ideas : [];

  if (items.length === 0) return null;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => onSelectCard(`${item.title} ${item.text}`)}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>{item.title}</Text>
            <Text style={{ color: Colors.greyLight, fontSize: 14 }}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.search_input,
    padding: 14,
    borderRadius: 10,
  },
  skeletonCard: {
    width: 200,
    height: 60,
  },
  skeletonTitle: {
    width: 120,
    height: 14,
    borderRadius: 4,
    backgroundColor: Colors.greyLight,
    opacity: 0.3,
    marginBottom: 8,
  },
  skeletonText: {
    width: 160,
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.greyLight,
    opacity: 0.2,
  },
});

export default MessageIdeas;

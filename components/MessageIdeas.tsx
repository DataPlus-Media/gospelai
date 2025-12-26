import Colors from '@/constants/Colors';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PredefinedMessages = [
  { title: 'Like a mustard seed', text: "why is this significant" },
  { title: 'Suggest godly activites', text: 'for the weekend with friends' },
  { title: 'Provide three bible verses', text: "to say before a job interview" },
];

type Props = {
  onSelectCard: (message: string) => void;
};

const MessageIdeas = ({ onSelectCard }: Props) => {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          gap: 16,
        }}>
        {PredefinedMessages.map((item, index) => (
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
  card: {
    backgroundColor: Colors.search_input,
    padding: 14,
    borderRadius: 10,
  },
});
export default MessageIdeas;
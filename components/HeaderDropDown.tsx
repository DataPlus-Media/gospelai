import Colors from '@/constants/Colors';
import { Text, TouchableOpacity, View } from 'react-native';

export type Props = { title: string; onPress?: () => void };

const HeaderDropDown = ({ title, onPress }: Props) => (
  <TouchableOpacity accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? `${title}, return to Today` : title} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text
        style={{
          fontWeight: '700',
          fontSize: 18,
          color: Colors.header_txt,
        }}
      >
        {title}
      </Text>
    </View>
  </TouchableOpacity>
);

export default HeaderDropDown;
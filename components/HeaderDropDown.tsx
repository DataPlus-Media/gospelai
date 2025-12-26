import Colors from '@/constants/Colors';
import { Text, TouchableOpacity, View } from 'react-native';

export type Props = { title: string; onPress?: () => void };

const HeaderDropDown = ({ title, onPress }: Props) => (
  <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text
        style={{
          fontWeight: '700',
          fontSize: 18,
          color: Colors.header_txt || '#f3f4f6',
        }}
      >
        {title}
      </Text>
    </View>
  </TouchableOpacity>
);

export default HeaderDropDown;
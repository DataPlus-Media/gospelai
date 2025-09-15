import { Text, View } from "react-native";
import BottomLoginSheet from "@/components/BottomLoginSheet";
import AnimatedIntro from '@/components/AnimatedIntro';

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
      }}>
     <AnimatedIntro />
     <BottomLoginSheet />
    </View>
  );
}

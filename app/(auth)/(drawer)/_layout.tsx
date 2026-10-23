// app/(auth)/(drawer)/_layout.tsx
import Colors from '@/constants/Colors';
import CustomDrawerContent from '@/components/navigation/CustomDrawerContent';
import { drawerPalette as palette, drawerStyles as styles } from '@/components/navigation/drawerTheme';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useWindowDimensions, TouchableOpacity, View, Image } from 'react-native';

export default function Layout() {
  const dimensions = useWindowDimensions();
  const router = useRouter();
  const drawerWidth = Math.min(dimensions.width * 0.88, 420);

  return (
    <Drawer
      initialRouteName="today"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerLeft: () => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open navigation"
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={{ marginLeft: 16, minWidth: 40, minHeight: 44, justifyContent: 'center' }}
          >
            <FontAwesome6 name="grip-lines" size={20} color={palette.text} />
          </TouchableOpacity>
        ),
        headerStyle: { backgroundColor: Colors.header_bg },
        headerTintColor: Colors.header_txt,
        headerShadowVisible: false,
        drawerActiveBackgroundColor: 'transparent',
        drawerInactiveBackgroundColor: 'transparent',
        drawerActiveTintColor: palette.text,
        drawerInactiveTintColor: palette.muted,
        overlayColor: 'rgba(0,0,0,0.72)',
        drawerItemStyle: { borderRadius: 12, marginHorizontal: 8, marginVertical: 2 },
        drawerLabelStyle: { marginLeft: -10, fontWeight: '600' },
        drawerStyle: {
          width: drawerWidth,
          maxWidth: 420,
          backgroundColor: palette.background,
          borderRightWidth: 1,
          borderRightColor: palette.border,
        },
      })}
    >
      <Drawer.Screen
        name="today"
        options={{
          title: 'Today',
          drawerIcon: () => <Ionicons name="sunny-outline" size={22} color={palette.gold} />,
        }}
      />
      <Drawer.Screen
        name="saved"
        options={{
          title: 'Saved verses',
          drawerIcon: () => <Ionicons name="bookmark-outline" size={22} color={palette.gold} />,
        }}
      />
      <Drawer.Screen
        name="library"
        options={{
          title: 'Authors insight',
          drawerIcon: () => <Ionicons name="library-outline" size={22} color={palette.gold} />,
        }}
      />
      <Drawer.Screen
        name="(chat)/new"
        getId={() => Math.random().toString()}
        options={{
          title: 'Chat',
          drawerIcon: () => (
            <View style={styles.item}>
              <Image source={require('@/assets/images/logo-white.png')} style={styles.btnImage} />
            </View>
          ),
          headerRight: () => null,
        }}
      />
      <Drawer.Screen
        name="(chat)/[id]"
        options={{
          drawerItemStyle: { display: 'none' },
          headerRight: () => (
            <Link href={'/(auth)/(drawer)/(chat)/new'} push asChild>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Start a new conversation"
                style={styles.headerAction}
              >
                <Ionicons name="create-outline" size={24} color={palette.text} />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
      <Drawer.Screen
        name="bible"
        options={{
          title: 'Bible',
          drawerIcon: () => <Image source={require('@/assets/images/bible.png')} style={styles.bibleImage} />,
        }}
        listeners={{
          drawerItemPress: (event) => {
            event.preventDefault();
            router.navigate('/(auth)/(drawer)/bible');
          },
        }}
      />
      <Drawer.Screen
        name="notes"
        options={{
          title: 'Notes',
          drawerIcon: () => <Ionicons name="document-text-outline" size={22} color={palette.gold} />,
        }}
      />
      <Drawer.Screen
        name="support"
        options={{
          title: 'Support GospelAI',
          drawerIcon: () => <Ionicons name="heart-outline" size={22} color={palette.gold} />,
        }}
      />
    </Drawer>
  );
}

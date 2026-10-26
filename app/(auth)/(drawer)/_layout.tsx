// app/(auth)/(drawer)/_layout.tsx
import Colors from '@/constants/Colors';
import CustomDrawerContent from '@/components/navigation/CustomDrawerContent';
import { MainScreenLayout } from '@/components/navigation/BottomNavigation';
import { scriptureFontFamily } from '@/constants/DesignTokens';
import { drawerPalette as palette, drawerStyles as styles } from '@/components/navigation/drawerTheme';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useWindowDimensions, TouchableOpacity, View, Image, Text, Platform } from 'react-native';

export default function Layout() {
  const dimensions = useWindowDimensions();
  const router = useRouter();
  const drawerWidth = Math.min(dimensions.width * 0.88, 420);

  return (
    // CSS clip prevents focus restoration from scrolling the off-screen drawer
    // into view after a conversation-options modal closes. Native uses hidden.
    <View style={{ flex: 1, overflow: Platform.OS === 'web' ? 'clip' as 'hidden' : 'hidden' }}>
    <Drawer
      initialRouteName="today"
      screenLayout={MainScreenLayout}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        drawerPosition: 'right',
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
          borderLeftWidth: 1,
          borderLeftColor: palette.border,
        },
      })}
    >
      <Drawer.Screen
        name="today"
        options={({ navigation }) => ({
          title: 'Today',
          headerStyle: { backgroundColor: '#0C191C', borderBottomWidth: 1, borderBottomColor: '#2D464B' },
          headerTitleAlign: 'left',
          headerLeft: () => null,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={require('@/assets/images/logo-white.png')} style={{ width: 34, height: 34, borderRadius: 9 }} accessible={false} />
              <Text style={{ color: '#F0F5F1', fontSize: 24, fontFamily: scriptureFontFamily }}>GospelAI</Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open navigation"
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={{ marginRight: 16, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <FontAwesome6 name="grip-lines" size={20} color="#AAE5DE" />
            </TouchableOpacity>
          ),
          drawerIcon: () => <Ionicons name="sunny-outline" size={22} color={palette.gold} />,
        })}
      />
      <Drawer.Screen
        name="welcome"
        options={{
          title: 'Welcome',
          drawerIcon: () => <Ionicons name="sparkles-outline" size={22} color={palette.gold} />,
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
    </View>
  );
}

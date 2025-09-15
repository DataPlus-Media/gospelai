import Colors from '@/constants/Colors';          //  app-wide color constants
import { defaultStyles } from '@/constants/Styles'; //  shared style presets (like button base)
import { Ionicons } from '@expo/vector-icons';   // icon set for iOS/Android
import { Link } from 'expo-router';              //  navigation links
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; //  handle notch / safe-area spacing

// 📌 Component: bottom sheet with login/register options
const BottomLoginSheet = () => {
  // Get bottom safe area inset (accounts for iPhone notch, Android navbar, etc.)
  const { bottom } = useSafeAreaInsets();

  return (
    // Outer container fixed to bottom with safe-area padding
    <View style={[styles.container, { paddingBottom: bottom }]}>
      
      {/* 🍏 Sign in with Apple button */}
      <TouchableOpacity style={[defaultStyles.btn, styles.btnLight]}>
        <Ionicons name="logo-apple" size={14} style={styles.btnIcon} />
        <Text style={styles.btnLightText}>Continue with Apple</Text>
      </TouchableOpacity>

      {/* 🌐 Sign in with Google button */}
      <TouchableOpacity style={[defaultStyles.btn, styles.btnDark]}>
        <Ionicons name="logo-google" size={16} style={styles.btnIcon} color={'#fff'} />
        <Text style={styles.btnDarkText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* 📧 Register with email button → navigates to /login?type=register */}
      <Link
        href={{
          pathname: '/login',
          params: { type: 'register' },  // Passes query param to login page
        }}
        style={[defaultStyles.btn, styles.btnDark]}
        asChild // ✅ passes Link navigation behavior into TouchableOpacity
      >
        <TouchableOpacity>
          <Ionicons name="mail" size={20} style={styles.btnIcon} color={'#fff'} />
          <Text style={styles.btnDarkText}>Sign up with email</Text>
        </TouchableOpacity>
      </Link>

      {/* 🔑 Login button → navigates to /login?type=login */}
      <Link
        href={{
          pathname: '/login',
          params: { type: 'login' },
        }}
        style={[defaultStyles.btn, styles.btnOutline]}
        asChild
      >
        <TouchableOpacity>
          <Text style={styles.btnDarkText}>Log in</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Positioned absolutely at the bottom of the screen
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#000',        // Dark sheet background
    borderTopLeftRadius: 20,        // Rounded top corners
    borderTopRightRadius: 20,
    padding: 26,                    // Inner spacing
    gap: 14,                        // Vertical spacing between buttons
  },
  btnLight: {
    backgroundColor: '#fff',        // White background (Apple button)
  },
  btnLightText: {
    color: '#000',                  // Dark text on white
    fontSize: 20,
  },
  btnDark: {
    backgroundColor: Colors.grey,   // Dark background (Google, email buttons)
  },
  btnDarkText: {
    color: '#fff',                  // White text
    fontSize: 20,
  },
  btnOutline: {
    borderWidth: 3,                  // Outlined style (login button)
    borderColor: Colors.grey,
  },
  btnIcon: {
    paddingRight: 6,                 // Spacing between icon and text
  },
});

export default BottomLoginSheet;

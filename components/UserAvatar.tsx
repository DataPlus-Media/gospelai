import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type UserAvatarProps = {
  isSignedIn?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  fallbackName?: string | null;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

function getInitials(firstName?: string | null, lastName?: string | null, fallbackName?: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const source = (fullName || fallbackName || '').trim().split('@')[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return parts.slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();
  }

  return Array.from(parts[0] || '').slice(0, 2).join('').toUpperCase();
}

export default function UserAvatar({
  isSignedIn,
  firstName,
  lastName,
  fallbackName,
  size = 38,
  radius = 12,
  style,
}: UserAvatarProps) {
  const initials = isSignedIn ? getInitials(firstName, lastName, fallbackName) : '';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={initials ? `Profile initials ${initials}` : 'Default profile avatar'}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {initials ? (
        <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.36) }]}>{initials}</Text>
      ) : (
        <Ionicons name="person-outline" size={size * 0.52} color={Colors.coral} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.plum,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  initials: {
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

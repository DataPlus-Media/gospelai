

import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';

function getRevolutCheckoutUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const isRevolutHost =
      hostname === 'revolut.com' ||
      hostname.endsWith('.revolut.com') ||
      hostname === 'revolut.me' ||
      hostname.endsWith('.revolut.me');

    if (
      url.protocol !== 'https:' ||
      !isRevolutHost ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default function SupportWebFallback() {
  const [openError, setOpenError] = useState('');
  const eligibilityConfirmed =
    process.env.EXPO_PUBLIC_REVOLUT_ELIGIBILITY_APPROVED === 'true';
  const oneTimeUrl = getRevolutCheckoutUrl(
    process.env.EXPO_PUBLIC_REVOLUT_LINK_ONCE,
  );
  const monthlyUrl = getRevolutCheckoutUrl(
    process.env.EXPO_PUBLIC_REVOLUT_LINK_MONTHLY,
  );

  const openCheckout = (url: string | null) => {
    if (!eligibilityConfirmed || !url) return;
    setOpenError('');
    void Linking.openURL(url).catch(() => {
      setOpenError('We couldn’t open the checkout. Please try again later.');
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.card}>
          <View style={styles.mark} />
          <Text style={styles.eyebrow}>GOSPELAI</Text>
          <Text style={styles.title}>Support GospelAI</Text>
          <Text style={styles.body}>
            Your support helps us share clear, Bible-based answers and
            Christ-centred resources. Study features remain available without
            supporting us.
          </Text>
          <View style={styles.options}>
            <Text style={styles.sectionTitle}>Support online</Text>
            <CheckoutOption
              label="One-time support"
              url={oneTimeUrl}
              eligibilityConfirmed={eligibilityConfirmed}
              onPress={() => openCheckout(oneTimeUrl)}
            />
            <CheckoutOption
              label="Monthly support"
              url={monthlyUrl}
              eligibilityConfirmed={eligibilityConfirmed}
              onPress={() => openCheckout(monthlyUrl)}
            />
            {!eligibilityConfirmed ? (
              <Text style={styles.unavailable} accessibilityLiveRegion="polite">
                Online checkout is unavailable until Revolut eligibility is
                confirmed.
              </Text>
            ) : null}
            {openError ? (
              <Text style={styles.unavailable} accessibilityLiveRegion="polite">
                {openError}
              </Text>
            ) : null}
            <Text style={styles.note}>
              On iOS and Android, support purchases are handled separately by
              the Apple App Store or Google Play.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function CheckoutOption({
  label,
  url,
  eligibilityConfirmed,
  onPress,
}: {
  label: string;
  url: string | null;
  eligibilityConfirmed: boolean;
  onPress: () => void;
}) {
  const available = eligibilityConfirmed && Boolean(url);

  return (
    <View style={styles.option}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityHint={
          available
            ? 'Opens Revolut-hosted checkout in your browser.'
            : 'This checkout option is currently unavailable.'
        }
        accessibilityState={{ disabled: !available }}
        disabled={!available}
        onPress={onPress}
        style={({ pressed }) => [
          styles.checkoutButton,
          !available && styles.checkoutButtonDisabled,
          pressed && available && styles.checkoutButtonPressed,
        ]}
      >
        <Text style={[styles.checkoutText, !available && styles.checkoutTextDisabled]}>
          {label}
        </Text>
      </Pressable>
      {!url ? (
        <Text style={styles.unavailable}>
          {label} checkout is unavailable.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  mark: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.coral,
    marginBottom: 18,
  },
  eyebrow: {
    color: Colors.coral,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  options: {
    width: '100%',
    marginTop: 28,
    gap: 12,
  },
  option: {
    gap: 6,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  checkoutButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.coral,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  checkoutButtonDisabled: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  checkoutButtonPressed: {
    opacity: 0.82,
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkoutTextDisabled: {
    color: Colors.textMuted,
  },
  unavailable: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  note: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
});

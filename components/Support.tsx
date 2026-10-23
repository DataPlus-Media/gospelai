// app/(auth)/(drawer)/support.tsx

import { useIAP } from 'expo-iap';
import { useEffect, useMemo, useState } from 'react';
import Colors from '@/constants/Colors';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Map UI amounts → App Store product IDs
const PRODUCT_IDS_BY_AMOUNT: Record<number, string> = {
  5: 'tip_5', // make sure these IDs exactly match App Store Connect
  10: 'tip_10',
  20: 'tip_20',
};

const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS_BY_AMOUNT);

function AmountChips({
  amount,
  onPick,
  currency = '€',
}: {
  amount: number;
  onPick: (n: number) => void;
  currency?: string;
}) {
  const presets = [5, 10, 20];
  const [focusedAmount, setFocusedAmount] = useState<number | null>(null);
  return (
    <View style={styles.chips}>
      {presets.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityLabel={`Tip €${v}`}
          accessibilityState={{ selected: amount === v }}
          onPress={() => onPick(v)}
          onFocus={() => setFocusedAmount(v)}
          onBlur={() => setFocusedAmount((current) => current === v ? null : current)}
          style={({ pressed }) => [
            styles.chip,
            amount === v && styles.chipActive,
            pressed && styles.pressed,
            focusedAmount === v && styles.focused,
          ]}
        >
          <Text style={[styles.chipText, amount === v && styles.chipTextActive]}>
            {currency}
            {v}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SupportScreen() {
  const [amount, setAmount] = useState(5);
  const [freq, setFreq] = useState<'once' | 'monthly'>('once');
  const [amountFocused, setAmountFocused] = useState(false);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);
  const focusHandlers = (action: string) => ({
    onFocus: () => setFocusedAction(action),
    onBlur: () =>
      setFocusedAction((current) => (current === action ? null : current)),
  });

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } =
    useIAP({
      onPurchaseSuccess: async (purchase) => {
        try {
          await finishTransaction({ purchase, isConsumable: true });
          Alert.alert('Thank you', 'Your gift helps us keep sharing GospelAI.');
        } catch (err) {
          console.warn('finishTransaction error', err);
        }
      },
      onPurchaseError: (error) => {
        console.warn('Purchase failed:', error);
        Alert.alert(
          'Purchase didn’t go through',
          error?.message || 'Please try again.'
        );
      },
    });

  // Load products once StoreKit is ready
  useEffect(() => {
    if (!connected) return;

    fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'in-app' }).then((res) => {
      console.log('Loaded IAP products:', res);
    });
  }, [connected, fetchProducts]);

  const currentSku = useMemo(() => PRODUCT_IDS_BY_AMOUNT[amount], [amount]);

  // ✅ NEW: look up the selected product from the loaded products list
  const currentProduct = useMemo(
    () => products.find((p) => p.id === currentSku),
    [products, currentSku]
  );

  // ✅ NEW: only allow purchasing when Store is connected AND the selected product exists
  const canPurchase = useMemo(
    () => connected && !!currentSku && !!currentProduct,
    [connected, currentSku, currentProduct]
  );

  // Use App Store price if available, otherwise fall back to €amount
  const currentDisplayPrice = useMemo(() => {
    return currentProduct?.displayPrice ?? `€${amount}`;
  }, [currentProduct, amount]);

  const onCustomAmount = (v: string) => {
    const val = Number(String(v).replace(',', '.'));
    if (!Number.isNaN(val)) {
      setAmount(Math.max(1, Math.floor(val)));
    } else if (v === '') {
      setAmount(0);
    }
  };

  async function handleDonate() {
    if (!connected) {
      Alert.alert('Store isn’t ready yet', 'Wait a few seconds, then try again.');
      return;
    }

    if (!currentSku) {
      Alert.alert(
        'Amount not supported',
        'For now, choose one of the preset amounts: 5, 10, or 20.'
      );
      return;
    }

    // ✅ NEW: if products didn't load (common when IAP not approved / not available),
    // prevent a confusing purchase flow and show a clear message.
    if (!currentProduct) {
      Alert.alert(
        'Purchases unavailable',
        'Tips aren’t available right now. Please try again later.'
      );
      return;
    }

    try {
      await requestPurchase({
        request: {
          apple: { sku: currentSku },
          google: { skus: [currentSku] }, // future-proof for Android
        },
        type: 'in-app',
      });
    } catch (e: any) {
      console.warn('requestPurchase error', e);
      Alert.alert(
        'Purchase didn’t go through',
        e?.message || 'Please try again.'
      );
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Support GospelAI</Text>
          <Text style={styles.lede}>
            Gifts are handled as secure in-app “tips”. Your support helps us share
            clear, Bible-based answers (KJV only) and Christ-centred resources with
            more people.
          </Text>

          {/* Amount */}
          <View style={styles.card}>
            <View style={styles.block}>
              <Text style={styles.label}>Choose an amount</Text>
              <AmountChips amount={amount} onPick={setAmount} />
              <View
                style={[
                  styles.amountWrap,
                  amountFocused && styles.focused,
                ]}
              >
                <Text style={styles.currency}>€</Text>
                <TextInput
                  style={styles.amountInput}
                  inputMode="decimal"
                  placeholder="Custom tip amount"
                  accessibilityLabel="Custom tip amount in euros"
                  placeholderTextColor={styles.placeholder.color}
                  value={String(amount)}
                  onChangeText={onCustomAmount}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              {/* ✅ Optional helper text when products aren't available */}
              {connected && currentSku && !currentProduct ? (
                <Text style={[styles.note, { marginTop: 10 }]}>
                  Purchases are currently unavailable.
                </Text>
              ) : null}
            </View>
          </View>

          {/* Frequency (visual only) */}
          <View style={styles.card}>
            <View style={styles.block}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.segment}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="One-time support"
                accessibilityState={{ selected: freq === 'once' }}
                onPress={() => setFreq('once')}
                {...focusHandlers('frequency')}
                style={({ pressed }) => [
                  styles.segBtn,
                  freq === 'once' && styles.segBtnActive,
                  pressed && styles.pressed,
                  focusedAction === 'frequency' && styles.focused,
                ]}
              >
                <Text style={[styles.segText, freq === 'once' && styles.segTextActive]}>
                  One-time
                </Text>
              </Pressable>
              </View>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Support GospelAI with ${currentDisplayPrice}`}
            accessibilityState={{ disabled: !canPurchase }}
            {...focusHandlers('support')}
            style={({ pressed }) => [
              styles.cta,
              !canPurchase && { opacity: 0.6 },
              pressed && styles.pressed,
              focusedAction === 'support' && styles.focused,
            ]} // ✅ NEW: dim when disabled
            onPress={handleDonate}
            disabled={!canPurchase} // ✅ NEW: only enabled when product is loaded
          >
            <Text style={styles.ctaText}>
              Support GospelAI with {currentDisplayPrice}
            </Text>
          </Pressable>

          <Text style={styles.note}>Built with ❤️ · KJV Scripture references only.</Text>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0b1116',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#e9edf5',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  lede: {
    color: '#aab9bd',
    lineHeight: 22,
    marginBottom: 22,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#121d24',
    borderColor: '#26383d',
    borderWidth: 1,
    borderRadius: 19,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
  },
  block: { marginTop: 1 },
  blockRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontWeight: '800', color: '#e5eeec', marginBottom: 12, fontSize: 14 },
  chips: { flexDirection: 'row', gap: 10, marginBottom: 13, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: '#395157',
    backgroundColor: '#17242a',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 13,
    minWidth: 72,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#176b54',
    borderColor: Colors.sky,
    borderWidth: 2,
  },
  chipText: { color: '#b8c6c7', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#395157',
    backgroundColor: '#10191e',
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 50,
  },
  currency: { color: '#a8c5bf', fontWeight: '800', marginRight: 8, fontSize: 16 },
  amountInput: { flex: 1, fontSize: 16, color: '#e9edf5' },
  placeholder: { color: '#8891a6' },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#10191e',
    borderColor: '#31464c',
    borderWidth: 1,
    borderRadius: 13,
    padding: 4,
    alignSelf: 'flex-start',
  },
  segBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  segBtnActive: {
    backgroundColor: '#176b54',
    borderWidth: 1,
    borderColor: Colors.sky,
  },
  segText: { color: '#b2c0c2', fontWeight: '700' },
  segTextActive: { color: '#fff' },
  coverText: { color: '#b2b9c9', flex: 1, fontSize: 14 },
  cta: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.78 },
  focused: {
    borderColor: Colors.sky,
    borderWidth: 2,
  },
  note: { textAlign: 'center', marginTop: 20, color: '#91a5a7', lineHeight: 19 },
});


// app/(auth)/(drawer)/support.tsx

import { useIAP } from 'expo-iap';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  currency = 'Tip €',
}: {
  amount: number;
  onPick: (n: number) => void;
  currency?: string;
}) {
  const presets = [5, 10, 20];
  return (
    <View style={styles.chips}>
      {presets.map((v) => (
        <TouchableOpacity
          key={v}
          onPress={() => onPick(v)}
          style={[styles.chip, amount === v && styles.chipActive]}
        >
          <Text style={[styles.chipText, amount === v && styles.chipTextActive]}>
            {currency}
            {v}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SupportScreen() {
  const [amount, setAmount] = useState(5);
  const [freq, setFreq] = useState<'once' | 'monthly'>('once');

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } =
    useIAP({
      onPurchaseSuccess: async (purchase) => {
        try {
          await finishTransaction({ purchase, isConsumable: true });
          Alert.alert('Thank you!', 'Your gift helps us keep sharing GospelAI.');
        } catch (err) {
          console.warn('finishTransaction error', err);
        }
      },
      onPurchaseError: (error) => {
        console.warn('Purchase failed:', error);
        Alert.alert(
          'Purchase error',
          error?.message || 'Unable to complete the purchase. Please try again.'
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
      Alert.alert('Store not ready', 'Please wait a few seconds and try again.');
      return;
    }

    if (!currentSku) {
      Alert.alert(
        'Amount not supported',
        'For now, please choose one of the preset amounts (5, 10, 20).'
      );
      return;
    }

    // ✅ NEW: if products didn't load (common when IAP not approved / not available),
    // prevent a confusing purchase flow and show a clear message.
    if (!currentProduct) {
      Alert.alert(
        'Purchases unavailable',
        'Tips are temporarily unavailable. Please try again later.'
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
        'Purchase error',
        e?.message || 'Unable to start purchase. Please try again.'
      );
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.page}>
        <View style={styles.container}>
          <Text style={styles.title}>Support the mission</Text>
          <Text style={styles.lede}>
            Gifts are handled as secure in-app “tips”. Your support helps us share
            clear, Bible-based answers (KJV only) and Christ-centred resources with
            more people.
          </Text>

          {/* Amount */}
          <View style={styles.block}>
            <Text style={styles.label}>Amount</Text>
            <AmountChips amount={amount} onPick={setAmount} />
            <View style={styles.amountWrap}>
              <Text style={styles.currency}>€</Text>
              <TextInput
                style={styles.amountInput}
                inputMode="decimal"
                placeholder="Custom amount"
                placeholderTextColor={styles.placeholder.color}
                value={String(amount)}
                onChangeText={onCustomAmount}
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

          {/* Frequency (visual only) */}
          <View style={styles.block}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.segment}>
              <TouchableOpacity
                onPress={() => setFreq('once')}
                style={[styles.segBtn, freq === 'once' && styles.segBtnActive]}
              >
                <Text style={[styles.segText, freq === 'once' && styles.segTextActive]}>
                  One-time
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, !canPurchase && { opacity: 0.6 }]} // ✅ NEW: dim when disabled
            onPress={handleDonate}
            disabled={!canPurchase} // ✅ NEW: only enabled when product is loaded
          >
            <Text style={styles.ctaText}>
              Support GospelAI with {currentDisplayPrice}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>Built with ❤️ · KJV Scripture references only ·</Text>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

/* ---- your existing styles unchanged ---- */
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0b0d12',
  },
  container: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e9edf5',
    marginBottom: 8,
  },
  lede: {
    color: '#b2b9c9',
    lineHeight: 20,
    marginBottom: 18,
  },
  block: { marginTop: 16 },
  blockRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontWeight: '700', color: '#e9edf5', marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: '#1e2332',
    backgroundColor: '#0f1117',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#2e7bef',
    borderColor: '#2e7bef',
  },
  chipText: { color: '#b2b9c9', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2332',
    backgroundColor: '#0f1117',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 46,
  },
  currency: { color: '#b2b9c9', fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 16, color: '#e9edf5' },
  placeholder: { color: '#8891a6' },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#141825',
    borderRadius: 10,
    padding: 3,
    alignSelf: 'flex-start',
  },
  segBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  segBtnActive: { backgroundColor: '#2e7bef' },
  segText: { color: '#b2b9c9', fontWeight: '700' },
  segTextActive: { color: '#fff' },
  coverText: { color: '#b2b9c9', flex: 1, fontSize: 14 },
  cta: {
    marginTop: 18,
    backgroundColor: '#2e7bef',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { textAlign: 'center', marginTop: 22, color: '#8891a6' },
});


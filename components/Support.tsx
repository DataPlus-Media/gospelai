// app/(auth)/(drawer)/support.tsx

import {
  deepLinkToSubscriptions,
  ErrorCode,
  getActiveSubscriptions as fetchActiveSubscriptions,
  useIAP,
} from 'expo-iap';
import { useEffect, useMemo, useState } from 'react';
import Colors from '@/constants/Colors';
import {
  Alert,
  Keyboard,
  Platform,
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
const MONTHLY_PRODUCT_ID = 'support_monthly';

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
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState('');
  const focusHandlers = (action: string) => ({
    onFocus: () => setFocusedAction(action),
    onBlur: () =>
      setFocusedAction((current) => (current === action ? null : current)),
  });

  const {
    connected,
    products,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
  } = useIAP({
      onPurchaseSuccess: async (purchase) => {
        if (purchase.purchaseState === 'pending' || purchase.purchaseState === 'deferred') {
          const message =
            purchase.productId === MONTHLY_PRODUCT_ID
              ? 'Your subscription is awaiting store approval. It will begin if the store approves it.'
              : 'Your purchase is awaiting store approval. It will complete if the store approves it.';
          setPurchaseInProgress(false);
          setPurchaseStatus(message);
          Alert.alert('Approval pending', message);
          return;
        }

        try {
          const isMonthlySupport = purchase.productId === MONTHLY_PRODUCT_ID;
          await finishTransaction({ purchase, isConsumable: !isMonthlySupport });
          setPurchaseInProgress(false);
          setPurchaseStatus(
            isMonthlySupport
              ? 'Thank you for choosing monthly support. All study features remain free.'
              : 'Thank you. Your gift helps us keep sharing GospelAI.'
          );
          Alert.alert(
            'Thank you',
            isMonthlySupport
              ? 'Your monthly support is active. All study features remain free.'
              : 'Your gift helps us keep sharing GospelAI.'
          );
        } catch (err) {
          setPurchaseInProgress(false);
          console.warn('finishTransaction error', err);
          setPurchaseStatus('Your purchase was received but could not be completed on this device. Please contact support before trying again.');
          Alert.alert(
            'Purchase needs attention',
            'Your purchase was received but could not be completed on this device. Please contact support before trying again.'
          );
        }
      },
      onPurchaseError: (error) => {
        console.warn('Purchase failed:', error);
        setPurchaseInProgress(false);
        if (error?.code === ErrorCode.UserCancelled) {
          setPurchaseStatus('Purchase cancelled. You have not been charged.');
          Alert.alert('Purchase cancelled', 'You have not been charged.');
        } else if (
          error?.code === ErrorCode.Pending ||
          error?.code === ErrorCode.DeferredPayment
        ) {
          setPurchaseStatus('Your subscription is awaiting store approval. It will begin if the store approves it.');
          Alert.alert(
            'Approval pending',
            'Your subscription is awaiting store approval. It will begin if the store approves it.'
          );
        } else {
          setPurchaseStatus('The purchase could not be completed. Please try again later.');
          Alert.alert(
            'Purchase didn’t go through',
            error?.message || 'Please try again later.'
          );
        }
      },
    });

  // Load consumable tips and the auto-renewing monthly product from the stores.
  useEffect(() => {
    if (!connected) return;

    setProductsLoaded(false);
    Promise.all([
      fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'in-app' }),
      fetchProducts({ skus: [MONTHLY_PRODUCT_ID], type: 'subs' }),
    ]).finally(() => setProductsLoaded(true));
  }, [connected, fetchProducts]);

  const currentSku = useMemo(() => PRODUCT_IDS_BY_AMOUNT[amount], [amount]);

  // ✅ NEW: look up the selected product from the loaded products list
  const currentProduct = useMemo(
    () => products.find((p) => p.id === currentSku),
    [products, currentSku]
  );

  const monthlyProduct = useMemo(
    () => subscriptions.find((product) => product.id === MONTHLY_PRODUCT_ID),
    [subscriptions]
  );
  const androidOfferToken =
    monthlyProduct?.platform === 'android'
      ? monthlyProduct.subscriptionOfferDetailsAndroid?.[0]?.offerToken
      : undefined;

  // ✅ NEW: only allow purchasing when Store is connected AND the selected product exists
  const canPurchase = useMemo(
    () =>
      connected &&
      (freq === 'monthly'
        ? !!monthlyProduct &&
          (Platform.OS !== 'android' || !!androidOfferToken)
        : !!currentSku && !!currentProduct),
    [connected, freq, monthlyProduct, androidOfferToken, currentSku, currentProduct]
  );

  // Use App Store price if available, otherwise fall back to €amount
  const currentDisplayPrice = useMemo(() => {
    return currentProduct?.displayPrice ?? `€${amount}`;
  }, [currentProduct, amount]);
  const monthlyDisplayPrice = monthlyProduct?.displayPrice;

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

    if (freq === 'once' && !currentSku) {
      Alert.alert(
        'Amount not supported',
        'For now, choose one of the preset amounts: 5, 10, or 20.'
      );
      return;
    }

    // ✅ NEW: if products didn't load (common when IAP not approved / not available),
    // prevent a confusing purchase flow and show a clear message.
    if (freq === 'once' && !currentProduct) {
      Alert.alert(
        'Purchases unavailable',
        'Tips aren’t available right now. Please try again later.'
      );
      return;
    }

    if (freq === 'monthly' && !monthlyProduct) {
      Alert.alert(
        'Monthly support unavailable',
        'Monthly support is not available from the store right now. Please try again later.'
      );
      return;
    }

    if (freq === 'monthly' && Platform.OS === 'android' && !androidOfferToken) {
      Alert.alert(
        'Monthly support unavailable',
        'The monthly plan is not available from Google Play right now. Please try again later.'
      );
      return;
    }

    try {
      setPurchaseStatus('');
      setPurchaseInProgress(true);
      if (freq === 'monthly') {
        await requestPurchase({
          request: {
            apple: { sku: MONTHLY_PRODUCT_ID },
            google: {
              skus: [MONTHLY_PRODUCT_ID],
              subscriptionOffers: [{ sku: MONTHLY_PRODUCT_ID, offerToken: androidOfferToken! }],
            },
          },
          type: 'subs',
        });
      } else {
        await requestPurchase({
          request: {
            apple: { sku: currentSku },
            google: { skus: [currentSku] },
          },
          type: 'in-app',
        });
      }
    } catch (e: any) {
      console.warn('requestPurchase error', e);
      setPurchaseInProgress(false);
      if (e?.code === ErrorCode.UserCancelled) {
        setPurchaseStatus('Purchase cancelled. You have not been charged.');
      } else {
        setPurchaseStatus('The purchase could not be completed. Please try again later.');
      }
    }
  }

  async function handleRestore() {
    if (!connected) {
      Alert.alert('Store isn’t ready yet', 'Wait a few seconds, then try again.');
      return;
    }

    setRestoreInProgress(true);
    setPurchaseStatus('');
    try {
      await restorePurchases();
      const activeSubscriptions = await fetchActiveSubscriptions([MONTHLY_PRODUCT_ID]);
      const hasMonthlySupport = activeSubscriptions.some(
        (subscription) => subscription.isActive
      );
      const message = hasMonthlySupport
        ? 'Your active monthly support subscription has been restored. All study features remain free.'
        : 'No active monthly support subscription was found for this store account.';
      setPurchaseStatus(message);
      Alert.alert(hasMonthlySupport ? 'Subscription restored' : 'Nothing to restore', message);
    } catch (error: any) {
      console.warn('Restore purchases error', error);
      setPurchaseStatus('Purchases could not be restored. Please try again later.');
      Alert.alert('Restore failed', error?.message || 'Please try again later.');
    } finally {
      setRestoreInProgress(false);
    }
  }

  async function handleManageSubscription() {
    try {
      await deepLinkToSubscriptions({
        skuAndroid: MONTHLY_PRODUCT_ID,
        packageNameAndroid: 'com.steomi.gospelsai',
      });
    } catch (error: any) {
      console.warn('Open subscription management error', error);
      Alert.alert(
        'Couldn’t open subscriptions',
        error?.message || 'Open your Apple or Google account settings to manage subscriptions.'
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
            clear, Bible-based answers and Christ-centred resources with
            more people.
          </Text>

          {/* Working purchase frequency selector */}
          <View style={styles.card}>
            <View style={styles.block}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.segment}>
                {(['once', 'monthly'] as const).map((frequency) => (
                  <Pressable
                    key={frequency}
                    accessibilityRole="button"
                    accessibilityLabel={
                      frequency === 'once' ? 'One-time support' : 'Monthly support'
                    }
                    accessibilityState={{ selected: freq === frequency }}
                    onPress={() => {
                      setFreq(frequency);
                      setPurchaseStatus('');
                    }}
                    {...focusHandlers(`frequency-${frequency}`)}
                    style={({ pressed }) => [
                      styles.segBtn,
                      freq === frequency && styles.segBtnActive,
                      pressed && styles.pressed,
                      focusedAction === `frequency-${frequency}` && styles.focused,
                    ]}
                  >
                    <Text style={[styles.segText, freq === frequency && styles.segTextActive]}>
                      {frequency === 'once' ? 'One-time' : 'Monthly'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {freq === 'once' ? (
            <View style={styles.card}>
              <View style={styles.block}>
                <Text style={styles.label}>Choose an amount</Text>
                <AmountChips amount={amount} onPick={setAmount} />
                <View style={[styles.amountWrap, amountFocused && styles.focused]}>
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
                {connected && productsLoaded && currentSku && !currentProduct ? (
                  <Text style={[styles.note, { marginTop: 10 }]}>
                    One-time tips are currently unavailable from the store.
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>Monthly support</Text>
              {monthlyDisplayPrice ? (
                <Text style={styles.monthlyPrice}>{monthlyDisplayPrice} / month</Text>
              ) : (
                <Text style={styles.note}>
                  {!connected || !productsLoaded
                    ? 'Checking monthly support availability…'
                    : 'Monthly support is currently unavailable from the store.'}
                </Text>
              )}
              <Text style={styles.renewalTerms}>
                This is an auto-renewing monthly subscription billed by{' '}
                {Platform.OS === 'ios' ? 'Apple' : 'Google Play'}. It renews each month until
                cancelled. You can cancel at any time in your store account; cancellation takes
                effect at the end of the current billing period. All GospelAI study features
                remain free.
              </Text>
            </View>
          )}

          {/* CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              freq === 'monthly'
                ? `Support GospelAI monthly${monthlyDisplayPrice ? ` for ${monthlyDisplayPrice}` : ''}`
                : `Support GospelAI with ${currentDisplayPrice}`
            }
            accessibilityState={{ disabled: !canPurchase }}
            {...focusHandlers('support')}
            style={({ pressed }) => [
              styles.cta,
              (!canPurchase || purchaseInProgress) && { opacity: 0.6 },
              pressed && styles.pressed,
              focusedAction === 'support' && styles.focused,
            ]}
            onPress={handleDonate}
            disabled={!canPurchase || purchaseInProgress}
          >
            <Text style={styles.ctaText}>
              {purchaseInProgress
                ? 'Waiting for store…'
                : freq === 'monthly'
                  ? monthlyDisplayPrice
                    ? `Support monthly for ${monthlyDisplayPrice}`
                    : 'Monthly support unavailable'
                  : `Support GospelAI with ${currentDisplayPrice}`}
            </Text>
          </Pressable>

          {purchaseStatus ? (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {purchaseStatus}
            </Text>
          ) : null}

          {freq === 'monthly' ? (
            <View style={styles.managementActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleRestore}
                disabled={restoreInProgress}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryActionText}>
                  {restoreInProgress ? 'Restoring…' : 'Restore purchases'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleManageSubscription}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryActionText}>Manage subscription</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.note}>Made for You · GospelAI.</Text>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  lede: {
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: 22,
    fontSize: 15,
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 19,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
  },
  block: { marginTop: 1 },
  blockRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontWeight: '800', color: Colors.text, marginBottom: 12, fontSize: 14 },
  chips: { flexDirection: 'row', gap: 10, marginBottom: 13, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceRaised,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 13,
    minWidth: 72,
    minHeight: 44,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.plum,
    borderColor: Colors.coral,
    borderWidth: 2,
  },
  chipText: { color: Colors.textMuted, fontWeight: '700' },
  chipTextActive: { color: Colors.text },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 50,
  },
  currency: { color: Colors.coralSoft, fontWeight: '800', marginRight: 8, fontSize: 16 },
  amountInput: { flex: 1, fontSize: 16, color: Colors.text },
  placeholder: { color: '#8891a6' },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 13,
    padding: 4,
    alignSelf: 'flex-start',
  },
  segBtn: { minHeight: 44, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  segBtnActive: {
    backgroundColor: Colors.plum,
    borderWidth: 1,
    borderColor: Colors.coral,
  },
  segText: { color: Colors.textMuted, fontWeight: '700' },
  segTextActive: { color: Colors.text },
  monthlyPrice: { color: Colors.text, fontSize: 23, fontWeight: '800', marginBottom: 8 },
  renewalTerms: { color: Colors.textMuted, fontSize: 14, lineHeight: 21 },
  status: { color: Colors.textMuted, textAlign: 'center', lineHeight: 21, marginTop: 14 },
  managementActions: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  secondaryAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceRaised,
  },
  secondaryActionText: { color: Colors.text, fontWeight: '700' },
  coverText: { color: '#b2b9c9', flex: 1, fontSize: 14 },
  cta: {
    marginTop: 4,
    backgroundColor: Colors.coral,
    borderColor: Colors.coral,
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
    borderColor: Colors.coral,
    borderWidth: 2,
  },
  note: { textAlign: 'center', marginTop: 20, color: '#A9A1A0', lineHeight: 19 },
});


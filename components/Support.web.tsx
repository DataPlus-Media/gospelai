import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SupportWebFallback() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.card}>
          <View style={styles.mark} />
          <Text style={styles.eyebrow}>GOSPELAI</Text>
          <Text style={styles.title}>Support GospelAI</Text>
          <Text style={styles.body}>
            You can support GospelAI through in-app purchases on iOS and Android.
            {'\n'}Thank you for helping us share clear, Bible-based answers and
            Christ-centred resources.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1116' },
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
    backgroundColor: '#121d24',
    borderColor: '#26383d',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  mark: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#45b78b',
    marginBottom: 18,
  },
  eyebrow: {
    color: '#8cb8a9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#e9edf5',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#aab9bd',
    textAlign: 'center',
    lineHeight: 24,
  },
});

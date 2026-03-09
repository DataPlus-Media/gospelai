import { openBibleDb } from '@/utils/bibleDb';
import { getTodaysVerse, VotdEntry } from '@/utils/verseOfDay';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const FALLBACK_TEXTS: Record<string, string> = {
  'John 3:16': 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  'Philippians 4:13': 'I can do all things through Christ which strengtheneth me.',
  'Jeremiah 29:11': 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
  'Psalms 23:1': 'The LORD is my shepherd; I shall not want.',
  'Romans 8:28': 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
  'Proverbs 3:5': 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.',
  'Isaiah 40:31': 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
  'Matthew 6:33': 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
  'Romans 12:2': 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.',
  'Philippians 4:6': 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
  'Psalm 46:1': 'God is our refuge and strength, a very present help in trouble.',
  'Galatians 5:22': 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,',
  'Ephesians 2:8': 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:',
  '1 Corinthians 13:4': 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,',
  'Matthew 5:3': 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.',
  'John 14:6': 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.',
  'Hebrews 11:1': 'Now faith is the substance of things hoped for, the evidence of things not seen.',
  'Romans 5:8': 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.',
  'Psalms 119:105': 'Thy word is a lamp unto my feet, and a light unto my path.',
  'John 15:13': 'Greater love hath no man than this, that a man lay down his life for his friends.',
  '2 Timothy 1:7': 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.',
  'Proverbs 31:25': 'Strength and honour are her clothing; and she shall rejoice in time to come.',
  'Isaiah 41:10': 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.',
  'Matthew 11:28': 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
  'Psalms 27:1': 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?',
  'Romans 8:38': 'For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come,',
  'Colossians 3:23': 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;',
  'Joshua 1:9': 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
  '1 John 4:19': 'We love him, because he first loved us.',
  'Micah 6:8': 'He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?',
  'Ephesians 6:10': 'Finally, my brethren, be strong in the Lord, and in the power of his might.',
  'Psalms 34:8': 'O taste and see that the LORD is good: blessed is the man that trusteth in him.',
  'John 10:10': 'The thief cometh not, but for to steal, and to kill, and to destroy: I am come that they might have life, and that they might have it more abundantly.',
  'Lamentations 3:22': 'It is of the LORD\'s mercies that we are not consumed, because his compassions fail not.',
  'Proverbs 3:6': 'In all thy ways acknowledge him, and he shall direct thy paths.',
  '2 Corinthians 5:17': 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.',
  'Mark 12:30': 'And thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind, and with all thy strength: this is the first commandment.',
  'Psalms 91:1': 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.',
  'Romans 3:23': 'For all have sinned, and come short of the glory of God;',
  'Hebrews 4:12': 'For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit, and of the joints and marrow, and is a discerner of the thoughts and intents of the heart.',
  '1 Peter 5:7': 'Casting all your care upon him; for he careth for you.',
  'John 1:1': 'In the beginning was the Word, and the Word was with God, and the Word was God.',
  'Psalms 37:4': 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.',
  'Luke 6:38': 'Give, and it shall be given unto you; good measure, pressed down, and shaken together, and running over, shall men give into your bosom. For with the same measure that ye mete withal it shall be measured to you again.',
  '2 Chronicles 7:14': 'If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven, and will forgive their sin, and will heal their land.',
  'Matthew 28:19': 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost:',
  'Revelation 3:20': 'Behold, I stand at the door, and knock: if any man hear my voice, and open the door, I will come in to him, and will sup with him, and he with me.',
  'Isaiah 26:3': 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.',
  'James 1:2': 'My brethren, count it all joy when ye fall into divers temptations;',
  'Philippians 4:7': 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
  'Genesis 1:1': 'In the beginning God created the heaven and the earth.',
  'Psalms 16:8': 'I have set the LORD always before me: because he is at my right hand, I shall not be moved.',
};

const FALLBACK_ENTRY: VotdEntry = {
  ref: 'John 3:16',
  book: 'John',
  bookId: 43,
  chapter: 3,
  verse: 16,
};

function safeGetTodaysVerse(): VotdEntry {
  try {
    return getTodaysVerse();
  } catch {
    return FALLBACK_ENTRY;
  }
}

export default function VerseOfDay() {
  const router = useRouter();
  const entryRef = useRef<VotdEntry>(safeGetTodaysVerse());
  const entry = entryRef.current;

  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openBibleDb();
        let row: { text: string } | null = null;
        try {
          row = await db.getFirstAsync<{ text: string }>(
            'SELECT text FROM verse WHERE book_id = ? AND chapter = ? AND verse = ?',
            [entry.bookId, entry.chapter, entry.verse]
          );
        } catch {
          row = await db.getFirstAsync<{ text: string }>(
            'SELECT text FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?',
            [entry.bookId, entry.chapter, entry.verse]
          );
        }
        if (!cancelled) {
          if (row?.text) {
            setText(row.text);
          } else {
            setText(FALLBACK_TEXTS[entry.ref] || '');
          }
        }
      } catch {
        if (!cancelled) {
          setText(FALLBACK_TEXTS[entry.ref] || '');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verseText = text || FALLBACK_TEXTS[entry.ref] || '';

  const doShare = async () => {
    try {
      await Share.share({
        message: `"${verseText}" — ${entry.ref} (KJV)\n\nShared from GospelAI`,
      });
    } catch {
      Alert.alert('Error', 'Could not open share sheet.');
    }
  };

  const onShare = () => {
    if (!verseText) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share Verse'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
        },
        (index) => { if (index === 1) doShare(); }
      );
    } else {
      doShare();
    }
  };

  const navigateToVerse = () => {
    try {
      router.navigate({
        pathname: '/(auth)/(drawer)/bible',
        params: { ref: entry.ref },
      });
    } catch {}
  };

  return (
    <Pressable onPress={navigateToVerse} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.labelWrap}>
          <Text style={styles.labelIcon}>✦</Text>
          <Text style={styles.label}>Verse of the Day</Text>
        </View>
        <Pressable onPress={onShare} hitSlop={10} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={19} color="#c8a951" />
        </Pressable>
      </View>

      {loading && !verseText ? (
        <View style={styles.skeleton}>
          <View style={[styles.skLine, { width: '100%' }]} />
          <View style={[styles.skLine, { width: '85%' }]} />
          <View style={[styles.skLine, { width: '70%' }]} />
        </View>
      ) : (
        <Text style={styles.verseText}>"{verseText}"</Text>
      )}

      <Text style={styles.ref}>{entry.ref} · KJV</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#111217',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a2e14',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  labelIcon: {
    color: '#c8a951',
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c8a951',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareBtn: {
    padding: 4,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#f3f4f6',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  ref: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c8a951',
    textAlign: 'right',
  },
  skeleton: {
    gap: 8,
    marginBottom: 10,
  },
  skLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1e2030',
  },
});

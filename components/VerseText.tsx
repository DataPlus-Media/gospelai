import { Link, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';

type Props = {
  text: string;
  hrefBase?: string;          // Defaults to '/bible'
  useLink?: boolean;          // If true, uses <Link>; else router.push
};

export default function VerseText({ text, hrefBase = '/bible', useLink = true }: Props) {
  const router = useRouter();

  // Split on [[...]] markers inserted by your backend/model
  // Example message: "See [[John 3:16]] and [[Ps 23:1-2]]."
  const parts: React.ReactNode[] = [];
  const re = /\[\[([^\]]+)\]\]/g; // <-- only matches the double-bracket markers, not the verse itself
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text))) {
    const start = m.index;
    const end = re.lastIndex;
    if (start > last) parts.push(<Text key={`t-${last}`}>{text.slice(last, start)}</Text>);
    const ref = m[1].trim();
    // Use object form to satisfy expo-router typed routes
    const href = { pathname: hrefBase as any, params: { ref } };
    if (useLink) {
      parts.push(
        <Link key={`v-${start}`} href={href} asChild>
          <Pressable>
            <Text style={{ color: '#2563eb', fontWeight: '600' }}>{ref}</Text>
          </Pressable>
        </Link>
      );
    } else {
      parts.push(
        <Pressable key={`v-${start}`} onPress={() => router.push(href)}>
            <Text style={{ color: '#2563eb', fontWeight: '600' }}>{ref}</Text>
        </Pressable>
      );
    }
    last = end;
  }
  if (last < text.length) parts.push(<Text key={`t-${last}`}>{text.slice(last)}</Text>);

  return <Text>{parts}</Text>;
}

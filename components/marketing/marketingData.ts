export const PUBLIC_PAGES = [
  { label: 'Home', href: '/' },
  { label: 'App features', href: '/features' },
  { label: 'Ask GospelAI', href: '/ask' },
  { label: 'Author insights', href: '/authors-insight' },
  { label: 'Support', href: '/support' },
];

export const STUDY_LINKS = [
  { label: 'Today', href: '/today' },
  { label: 'Bible', href: '/bible' },
  { label: 'Ask GospelAI', href: '/new' },
  { label: 'Saved', href: '/saved' },
  { label: 'Notes', href: '/notes' },
  { label: 'Library', href: '/library' },
];

export const EXAMPLES = [
  ['The good shepherd', 'John 10:11–18', 'Why does Jesus call himself the good shepherd?', 'Jesus contrasts his care for the sheep with the hired hand who runs when danger comes. He knows his sheep and willingly lays down his life for them.'],
  ['Abraham and Isaac', 'Genesis 22:1–14', 'What happens when Abraham offers Isaac?', 'God tests Abraham, stops him from harming Isaac, and provides a ram for the offering. Abraham names the place in remembrance of God’s provision.'],
  ['A lamp to my feet', 'Psalm 119:105–112', 'What does it mean that God’s word is a lamp?', 'The psalmist pictures God’s word lighting the path ahead. In the surrounding verses, that guidance gives direction as he faces suffering and danger.'],
] as const;

export const AUTHORS = [
  ['Bible commentary', 'Matthew Henry', 'Pastoral exposition with an emphasis on how a passage speaks to Christian life.'],
  ['Bible exposition', 'John Gill', 'Detailed verse-by-verse study that traces connections across Scripture.'],
  ['Sermons and devotion', 'C. H. Spurgeon', 'Christ-centred preaching and devotional reflections for everyday reading.'],
] as const;

export const LEFT_BOOKS = [
  ['The Gospel', 'John'], ['From the library', 'Henry'], ['Daily reading', 'Today'],
  ['Old Testament', 'Psalms'], ['Questions', 'Ask'], ['Study', 'Notes'],
];
export const RIGHT_BOOKS = [
  ['Exposition', 'Gill'], ['The beginning', 'Genesis'], ['Saved verses', 'Mark'],
  ['Morning reading', 'Grace'], ['New Testament', 'Romans'], ['From the library', 'Spurgeon'],
];

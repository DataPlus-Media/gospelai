import type { readSection } from '@/utils/library';

export type SectionContent = Awaited<ReturnType<typeof readSection>>;
export type LoadedSource = { content: SectionContent; notices: string[] };
export type CatalogState = 'rights' | 'download' | 'incomplete' | 'unmapped';

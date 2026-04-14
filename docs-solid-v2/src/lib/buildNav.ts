import { getCollection } from 'astro:content';

export interface NavLink {
  label: string;
  href: string;
  isNew?: boolean;
  isPreview?: boolean;
  isExternal?: boolean;
}

export interface NavSection {
  label: string;
  links: NavLink[];
}

// Mirrors the section order in docs/src/nav.ts
const SECTION_ORDER = ['overview', 'handbook', 'components', 'utils'] as const;

const SECTION_LABELS: Record<string, string> = {
  overview: 'Overview',
  handbook: 'Handbook',
  components: 'Components',
  utils: 'Utilities',
};

const TITLE_MAP: Record<string, string> = {
  'About Base UI': 'About',
  'About Base\u00A0UI': 'About',
};

const EXTRA_LINKS: Partial<Record<(typeof SECTION_ORDER)[number], NavLink[]>> = {
  handbook: [{ label: 'llms.txt', href: '/llms.txt', isExternal: true }],
};

export async function buildNav(): Promise<NavSection[]> {
  const entries = await getCollection('solid');
  const sectionEntries = new Map(
    entries
      .filter((entry) => !entry.id.includes('/'))
      .map((entry) => [entry.id.replace(/\.mdx$/, ''), entry]),
  );
  const buckets = new Map<string, Array<NavLink & { order: number; depth: number }>>();

  for (const entry of entries) {
    const id = entry.id.replace(/\.mdx$/, '');
    const parts = id.split('/');
    const [section, ...slugParts] = parts;

    if (!SECTION_ORDER.includes(section as (typeof SECTION_ORDER)[number])) {
      continue;
    }

    if (slugParts.length !== 1) {
      continue;
    }

    if (!buckets.has(section)) {
      buckets.set(section, []);
    }

    buckets.get(section)?.push({
      label: TITLE_MAP[entry.data.title ?? slugParts[0]] ?? entry.data.title ?? slugParts[0],
      href: `/solid/${id}`,
      isNew: entry.data.isNew ?? false,
      isPreview: entry.data.isPreview ?? false,
      order: entry.data.order ?? Number.MAX_SAFE_INTEGER,
      depth: slugParts.length,
    });
  }

  for (const links of buckets.values()) {
    links.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }

  return SECTION_ORDER.map((key) => ({
    label: sectionEntries.get(key)?.data.title ?? SECTION_LABELS[key],
    links: [
      ...(buckets.get(key) ?? []).map(({ order, depth, ...link }) => link),
      ...(EXTRA_LINKS[key] ?? []),
    ],
  })).filter((section) => section.links.length > 0);
}

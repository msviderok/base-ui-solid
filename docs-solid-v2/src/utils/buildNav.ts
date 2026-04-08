import { getCollection } from 'astro:content';

export interface NavLink {
  label: string;
  href: string;
  isNew?: boolean;
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

export async function buildNav(): Promise<NavSection[]> {
  const entries = await getCollection('solid');

  const buckets: Record<string, NavLink[]> = {
    overview: [],
    handbook: [],
    components: [],
    utils: [],
  };

  for (const entry of entries) {
    // entry.id = 'overview/quick-start.mdx'
    const id = entry.id.replace(/\.mdx$/, '');
    const slash = id.indexOf('/');
    if (slash === -1) continue;

    const section = id.slice(0, slash);
    const slug = id.slice(slash + 1);

    if (!(section in buckets)) continue;

    buckets[section].push({
      label: entry.data.title ?? slug,
      href: `/solid/${section}/${slug}`,
      isNew: entry.data.isNew ?? false,
    });
  }

  // Sort each section: overview/handbook/utils by `order` frontmatter,
  // components alphabetically by label (mirrors the React docs)
  for (const [section, links] of Object.entries(buckets)) {
    if (section === 'components') {
      links.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      links.sort((a, b) => {
        const aOrder = entries.find(
          (e) => e.id === `${section}/${a.href.split('/').pop()}.mdx`,
        )?.data.order ?? 99;
        const bOrder = entries.find(
          (e) => e.id === `${section}/${b.href.split('/').pop()}.mdx`,
        )?.data.order ?? 99;
        return aOrder - bOrder;
      });
    }
  }

  return SECTION_ORDER.map((key) => ({
    label: SECTION_LABELS[key],
    links: buckets[key],
  }));
}

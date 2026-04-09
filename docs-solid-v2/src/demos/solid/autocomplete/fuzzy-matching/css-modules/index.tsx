import { Autocomplete } from '@msviderok/base-ui-solid/autocomplete';
import { matchSorter } from 'match-sorter';
import styles from './index.module.css';

export default function ExampleFuzzyMatchingAutocomplete() {
  return (
    <Autocomplete.Root
      items={fuzzyItems}
      filter={fuzzyFilter}
      itemToStringValue={(item) => item.title}
    >
      <label class={styles.Label}>
        Fuzzy search documentation
        <Autocomplete.Input placeholder="e.g. React" class={styles.Input} />
      </label>
      <Autocomplete.Portal>
        <Autocomplete.Positioner class={styles.Positioner} sideOffset={4}>
          <Autocomplete.Popup class={styles.Popup}>
            <Autocomplete.Empty class={styles.Empty}>
              No results found for "{<Autocomplete.Value />}"
            </Autocomplete.Empty>

            <Autocomplete.List class={styles.List}>
              {(item: FuzzyItem) => (
                <Autocomplete.Item key={item.title} value={item} class={styles.Item}>
                  <Autocomplete.Value>
                    {(value) => (
                      <div class={styles.ItemContent}>
                        <div class={styles.ItemHeader}>
                          <div class={styles.ItemTitle}>{highlightText(item.title, value)}</div>
                        </div>
                        <div class={styles.ItemDescription}>
                          {highlightText(item.description, value)}
                        </div>
                      </div>
                    )}
                  </Autocomplete.Value>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}

function highlightText(text: string, query: string): any {
  const trimmed = query.trim();
  if (!trimmed) {
    return text;
  }

  const limited = trimmed.slice(0, 100);
  const escaped = limited.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');

  return text
    .split(regex)
    .map((part, idx) => (regex.test(part) ? <mark key={idx}>{part}</mark> : part));
}

function fuzzyFilter(item: FuzzyItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const results = matchSorter([item], query, {
    keys: [
      'title',
      'description',
      'category',
      { key: 'title', threshold: matchSorter.rankings.CONTAINS },
      { key: 'description', threshold: matchSorter.rankings.WORD_STARTS_WITH },
    ],
  });

  return results.length > 0;
}

interface FuzzyItem {
  title: string;
  description: string;
  category: string;
}

const fuzzyItems: FuzzyItem[] = [
  {
    title: 'React Hooks Guide',
    description: 'Learn how to use React Hooks like useState, useEffect, and custom hooks',
    category: 'React',
  },
  {
    title: 'JavaScript Array Methods',
    description: 'Master array methods like map, filter, reduce, and forEach in JavaScript',
    category: 'JavaScript',
  },
  {
    title: 'CSS Flexbox Layout',
    description: 'Complete guide to CSS Flexbox for responsive web design',
    category: 'CSS',
  },
  {
    title: 'TypeScript Interfaces',
    description: 'Understanding TypeScript interfaces and type definitions',
    category: 'TypeScript',
  },
  {
    title: 'React Performance Optimization',
    description: 'Tips and techniques for optimizing React application performance',
    category: 'React',
  },
  {
    title: 'HTML Semantic Elements',
    description: 'Using semantic HTML elements for better accessibility and SEO',
    category: 'HTML',
  },
  {
    title: 'Node.js Express Server',
    description: 'Building RESTful APIs with Node.js and Express framework',
    category: 'Node.js',
  },
  {
    title: 'Vue Composition API',
    description: 'Modern Vue.js development using the Composition API',
    category: 'Vue.js',
  },
  {
    title: 'Angular Components',
    description: 'Creating reusable Angular components with TypeScript',
    category: 'Angular',
  },
  {
    title: 'Python Django Framework',
    description: 'Web development with Python Django framework',
    category: 'Python',
  },
  {
    title: 'CSS Grid Layout',
    description: 'Advanced CSS Grid techniques for complex layouts',
    category: 'CSS',
  },
  {
    title: 'React Testing Library',
    description: 'Testing React components with React Testing Library',
    category: 'React',
  },
  {
    title: 'MongoDB Queries',
    description: 'Advanced MongoDB queries and aggregation pipelines',
    category: 'Database',
  },
  {
    title: 'Webpack Configuration',
    description: 'Optimizing Webpack configuration for production builds',
    category: 'Build Tools',
  },
  {
    title: 'SASS/SCSS Guide',
    description: 'Writing maintainable CSS with SASS and SCSS',
    category: 'CSS',
  },
];

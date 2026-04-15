import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHighlighter, type Highlighter } from 'shiki';
import { normalizeShikiHast, serializeDemoSource } from '../blocks/Demo/demoSourceUtils';
import type { SerializedDemoSource } from '../blocks/Demo';
import { themeCss } from './demo-theme-css';

const VIRTUAL_MANIFEST_ID = 'virtual:demos-manifest';
const RESOLVED_MANIFEST_ID = '\0virtual:demos-manifest';
const VIRTUAL_ENTRY_PREFIX = 'virtual:demos-entry:';
const RESOLVED_ENTRY_PREFIX = '\0virtual:demos-entry:';

// Same theme as the React/Solid docs
const theme = {
  name: 'base-ui',
  bg: 'var(--color-content)',
  fg: 'var(--syntax-default)',
  settings: [
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: 'var(--syntax-comment)' },
    },
    {
      scope: [
        'constant',
        'entity.name.constant',
        'variable.other.constant',
        'variable.other.enummember',
        'variable.language',
      ],
      settings: { foreground: 'var(--syntax-constant)' },
    },
    { scope: ['entity', 'entity.name'], settings: { foreground: 'var(--syntax-entity)' } },
    { scope: 'variable.parameter.function', settings: { foreground: 'var(--syntax-parameter)' } },
    { scope: 'entity.name.tag', settings: { foreground: 'var(--syntax-tag)' } },
    { scope: 'keyword', settings: { foreground: 'var(--syntax-keyword)' } },
    { scope: ['storage', 'storage.type'], settings: { foreground: 'var(--syntax-keyword)' } },
    {
      scope: [
        'string',
        'punctuation.definition.string',
        'string punctuation.section.embedded source',
      ],
      settings: { foreground: 'var(--syntax-string)' },
    },
    { scope: 'support', settings: { foreground: 'var(--syntax-constant)' } },
    { scope: 'variable', settings: { foreground: 'var(--syntax-variable)' } },
    { scope: 'variable.other', settings: { foreground: 'var(--syntax-parameter)' } },
  ],
};

interface DemoFile {
  raw: string;
  source: SerializedDemoSource;
}

interface DemoVariantEntry {
  componentFile: string;
  files: Record<string, DemoFile>;
}

interface DemoEntry {
  variants: string[];
  [variantName: string]: string[] | DemoVariantEntry;
}

interface DemoBuild {
  entries: Map<string, DemoEntry>;
  manifestModule: string;
}

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: [theme as any],
      langs: ['tsx', 'jsx', 'css', 'bash', 'json'],
    });
  }
  return highlighter;
}

function highlightCode(hl: Highlighter, code: string, lang: 'tsx' | 'css'): SerializedDemoSource {
  const hast = hl.codeToHast(code, { lang, theme: 'base-ui', defaultColor: false });
  return serializeDemoSource(normalizeShikiHast(hast));
}

function getLangFromFile(filename: string): 'tsx' | 'css' {
  return filename.endsWith('.css') ? 'css' : 'tsx';
}

const localImportPattern = /(?:from\s+|import\s+)(['"])(\.{1,2}\/[^'"]+)\1/g;
const supportedExtensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.css'];

function resolveLocalImport(fromFile: string, specifier: string): string | null {
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [resolved];

  for (const extension of supportedExtensions) {
    candidates.push(`${resolved}${extension}`);
    candidates.push(path.join(resolved, `index${extension}`));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function collectLocalFiles(entryFile: string, visited: Set<string> = new Set()): string[] {
  if (visited.has(entryFile)) {
    return [];
  }
  visited.add(entryFile);

  const content = fs.readFileSync(entryFile, 'utf-8');
  const files = [entryFile];

  for (const match of content.matchAll(localImportPattern)) {
    const specifier = match[2];
    const resolved = resolveLocalImport(entryFile, specifier);
    if (!resolved) {
      continue;
    }

    files.push(...collectLocalFiles(resolved, visited));
  }

  return files;
}

async function collectDemoEntries(projectRoot: string): Promise<Map<string, DemoEntry>> {
  const demosDir = path.join(projectRoot, 'src', 'demos', 'solid');

  if (!fs.existsSync(demosDir)) {
    return new Map();
  }

  const hl = await getHighlighter();

  interface VariantInfo {
    demoKey: string;
    variantName: string;
    componentFile: string;
    dir: string;
  }

  const componentFiles = await fg('**/*/index.tsx', { cwd: demosDir, absolute: true });
  const variants: VariantInfo[] = [];

  for (const file of componentFiles) {
    const rel = path.relative(demosDir, file);
    const parts = rel.split(path.sep);
    if (parts.length < 3) continue;

    const variant = parts.at(-2);
    const demoKey = parts.slice(0, -2).join('/');
    const variantDir = path.dirname(file);

    if (!variant || !demoKey) continue;

    variants.push({ demoKey, variantName: variant, componentFile: file, dir: variantDir });
  }

  const demoEntries = new Map<string, DemoEntry>();
  const sortedVariants = variants.sort((a, b) =>
    `${a.demoKey}/${a.variantName}`.localeCompare(`${b.demoKey}/${b.variantName}`),
  );

  for (const variant of sortedVariants) {
    const demoFiles: Record<string, DemoFile> = {};

    const allFiles = collectLocalFiles(variant.componentFile);
    const relativeFiles = allFiles
      .map((filePath) => ({
        filePath,
        relativePath: path.relative(variant.dir, filePath).split(path.sep).join('/'),
      }))
      .sort((a, b) => {
        if (a.relativePath === 'index.tsx') return -1;
        if (b.relativePath === 'index.tsx') return 1;
        return a.relativePath.localeCompare(b.relativePath);
      });

    for (const { filePath, relativePath } of relativeFiles) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const lang = getLangFromFile(filePath);
      const source = highlightCode(hl, raw, lang);
      demoFiles[relativePath] = { raw, source };
    }

    if (variant.variantName === 'css-modules') {
      demoFiles['theme.css'] = {
        raw: themeCss,
        source: highlightCode(hl, themeCss, 'css'),
      };
    }

    if (!demoEntries.has(variant.demoKey)) {
      demoEntries.set(variant.demoKey, { variants: [] });
    }

    demoEntries.get(variant.demoKey)?.variants.push(variant.variantName);
    (demoEntries.get(variant.demoKey) as DemoEntry)[variant.variantName] = {
      componentFile: variant.componentFile,
      files: demoFiles,
    };
  }

  return demoEntries;
}

function buildManifestModule(entries: Map<string, DemoEntry>): string {
  const sortedEntries = [...entries.entries()].sort(([a], [b]) => a.localeCompare(b));
  const loaders = sortedEntries.map(
    ([key], index) =>
      `const _loadDemo_${index} = () => import(${JSON.stringify(`${VIRTUAL_ENTRY_PREFIX}${key}`)});`,
  );
  const manifestEntries = sortedEntries.map(
    ([key, entry], index) =>
      `${JSON.stringify(key)}: { variants: ${JSON.stringify(entry.variants)}, load: _loadDemo_${index} }`,
  );

  return `
${loaders.join('\n')}

export const demoManifest = {
  ${manifestEntries.join(',\n  ')}
};
`.trim();
}

function buildEntryModule(entry: DemoEntry): string {
  const variantNames = entry.variants;
  const imports: string[] = [];
  const variantEntries = variantNames.map((variantName, index) => {
    const variantData = entry[variantName] as DemoVariantEntry;
    const importName = `_demoVariant_${index}`;
    imports.push(`import ${importName} from ${JSON.stringify(variantData.componentFile)};`);
    return `${JSON.stringify(variantName)}: { Component: ${importName}, files: ${JSON.stringify(
      variantData.files,
      null,
      2,
    )} }`;
  });

  return `
${imports.join('\n')}

const demoEntry = {
  variants: ${JSON.stringify(variantNames)},
  ${variantEntries.join(',\n  ')}
};

export default demoEntry;
`.trim();
}

async function buildVirtualModules(projectRoot: string): Promise<DemoBuild> {
  const entries = await collectDemoEntries(projectRoot);
  return {
    entries,
    manifestModule: buildManifestModule(entries),
  };
}

export function demosPlugin() {
  let projectRoot = '';
  let cachedBuild: DemoBuild | null = null;

  async function getBuild(): Promise<DemoBuild> {
    if (!cachedBuild) {
      cachedBuild = await buildVirtualModules(projectRoot);
    }
    return cachedBuild;
  }

  return {
    name: 'vite-demos-plugin',
    configResolved(config: { root: string }) {
      projectRoot = config.root;
    },
    resolveId(id: string) {
      if (id === VIRTUAL_MANIFEST_ID) {
        return RESOLVED_MANIFEST_ID;
      }

      if (id.startsWith(VIRTUAL_ENTRY_PREFIX)) {
        return `${RESOLVED_ENTRY_PREFIX}${id.slice(VIRTUAL_ENTRY_PREFIX.length)}`;
      }
    },
    async load(id: string) {
      if (id === RESOLVED_MANIFEST_ID) {
        return (await getBuild()).manifestModule;
      }

      if (id.startsWith(RESOLVED_ENTRY_PREFIX)) {
        const key = id.slice(RESOLVED_ENTRY_PREFIX.length);
        const entry = (await getBuild()).entries.get(key);

        if (!entry) {
          return 'export default null;';
        }

        return buildEntryModule(entry);
      }
    },
    configureServer(server: any) {
      const demosDir = path.join(projectRoot, 'src', 'demos', 'solid');
      server.watcher.add(demosDir);
      server.watcher.on('all', (_event: string, file: string) => {
        if (file.includes(path.join('src', 'demos', 'solid'))) {
          cachedBuild = null;

          for (const mod of server.moduleGraph.idToModuleMap.values()) {
            if (mod.id === RESOLVED_MANIFEST_ID || mod.id?.startsWith(RESOLVED_ENTRY_PREFIX)) {
              server.moduleGraph.invalidateModule(mod);
            }
          }
        }
      });
    },
  };
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHighlighter, type Highlighter } from 'shiki';
import fg from 'fast-glob';

const VIRTUAL_ID = 'virtual:demos';
const RESOLVED_ID = '\0virtual:demos';

// Same theme as the React/Solid docs
const theme = {
  name: 'base-ui',
  bg: 'var(--color-content)',
  fg: 'var(--syntax-default)',
  settings: [
    { scope: ['comment', 'punctuation.definition.comment', 'string.comment'], settings: { foreground: 'var(--syntax-comment)' } },
    { scope: ['constant', 'entity.name.constant', 'variable.other.constant', 'variable.other.enummember', 'variable.language'], settings: { foreground: 'var(--syntax-constant)' } },
    { scope: ['entity', 'entity.name'], settings: { foreground: 'var(--syntax-entity)' } },
    { scope: 'variable.parameter.function', settings: { foreground: 'var(--syntax-parameter)' } },
    { scope: 'entity.name.tag', settings: { foreground: 'var(--syntax-tag)' } },
    { scope: 'keyword', settings: { foreground: 'var(--syntax-keyword)' } },
    { scope: ['storage', 'storage.type'], settings: { foreground: 'var(--syntax-keyword)' } },
    { scope: ['string', 'punctuation.definition.string', 'string punctuation.section.embedded source'], settings: { foreground: 'var(--syntax-string)' } },
    { scope: 'support', settings: { foreground: 'var(--syntax-constant)' } },
    { scope: 'variable', settings: { foreground: 'var(--syntax-variable)' } },
    { scope: 'variable.other', settings: { foreground: 'var(--syntax-parameter)' } },
  ],
};

interface DemoFile {
  raw: string;
  highlighted: string;
}

interface DemoVariantData {
  componentIndex: number;
  files: Record<string, DemoFile>;
}

interface DemoData {
  variants: string[];
  [variantName: string]: string[] | DemoVariantData;
}

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({ themes: [theme as any], langs: ['tsx', 'jsx', 'css', 'bash', 'json'] });
  }
  return highlighter;
}

function highlightCode(hl: Highlighter, code: string, lang: 'tsx' | 'css'): string {
  return hl.codeToHtml(code, { lang, theme: 'base-ui', defaultColor: false });
}

function getLangFromFile(filename: string): 'tsx' | 'css' {
  return filename.endsWith('.css') ? 'css' : 'tsx';
}

async function buildVirtualModule(projectRoot: string): Promise<string> {
  const demosDir = path.join(projectRoot, 'src', 'demos', 'solid');

  if (!fs.existsSync(demosDir)) {
    return `export const demoComponents = [];\nexport const demoData = {};\n`;
  }

  const hl = await getHighlighter();

  // Find all demo component entry files (index.tsx per variant)
  const componentFiles = await fg('**/*/index.tsx', { cwd: demosDir, absolute: true });

  // Group by demo key.
  // Path structure: src/demos/solid/**/variant/index.tsx
  // The variant dir is the immediate parent of index.tsx.

  interface VariantInfo {
    demoKey: string;
    variantName: string;
    componentFile: string;
    dir: string;
  }

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

  // Build import statements and data structure
  const imports: string[] = [];
  const demoMap: Record<string, DemoData> = {};
  let componentIndex = 0;

  const sortedVariants = variants.sort((a, b) =>
    `${a.demoKey}/${a.variantName}`.localeCompare(`${b.demoKey}/${b.variantName}`),
  );

  for (const v of sortedVariants) {
    const importName = `_demo_${componentIndex}`;
    imports.push(`import ${importName} from ${JSON.stringify(v.componentFile)};`);

    // Collect all files in variant dir
    const allFiles = fs.readdirSync(v.dir);
    const demoFiles: Record<string, DemoFile> = {};

    for (const filename of allFiles) {
      if (filename === 'index.tsx' || filename.endsWith('.module.css')) {
        const filePath = path.join(v.dir, filename);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const lang = getLangFromFile(filename);
        const highlighted = highlightCode(hl, raw, lang);
        demoFiles[filename] = { raw, highlighted };
      }
    }

    if (!demoMap[v.demoKey]) {
      demoMap[v.demoKey] = { variants: [] };
    }
    (demoMap[v.demoKey].variants as string[]).push(v.variantName);
    (demoMap[v.demoKey] as any)[v.variantName] = {
      componentIndex,
      files: demoFiles,
    } satisfies DemoVariantData;

    componentIndex++;
  }

  const importsCode = imports.join('\n');
  const componentsArray = `[${imports.map((_, i) => `_demo_${i}`).join(', ')}]`;
  const demoDataJson = JSON.stringify(demoMap, null, 2);

  return `
${importsCode}

export const demoComponents = ${componentsArray};
export const demoData = ${demoDataJson};
`.trim();
}

export function demosPlugin() {
  let projectRoot = '';
  let cachedModule: string | null = null;

  return {
    name: 'vite-demos-plugin',
    configResolved(config: { root: string }) {
      projectRoot = config.root;
    },
    resolveId(id: string) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
    },
    async load(id: string) {
      if (id === RESOLVED_ID) {
        if (!cachedModule) {
          cachedModule = await buildVirtualModule(projectRoot);
        }
        return cachedModule;
      }
    },
    // Invalidate when demos change
    configureServer(server: any) {
      const demosDir = path.join(projectRoot, 'src', 'demos', 'solid');
      server.watcher.add(demosDir);
      server.watcher.on('change', (file: string) => {
        if (file.includes(path.join('src', 'demos', 'solid'))) {
          cachedModule = null;
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }
        }
      });
    },
  };
}

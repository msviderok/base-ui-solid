import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const reactDocsRoot = path.join(repoRoot, 'docs', 'src', 'app', '(docs)', 'react');
const outputRoot = path.join(repoRoot, 'docs-solid-v2', 'src', 'content', 'solid');

const SECTION_IDS = ['overview', 'handbook', 'components', 'utils'];
const FENCE_RE = /^```/;
const PAGE_LINK_RE = /(?<prefix>["'(])(?<target>\.\.?\/[^"'()]*\/page\.mdx)(?<suffix>["')])/g;
const ABSOLUTE_REACT_LINK_RE = /(?<prefix>["'(])\/react\/(?<target>[^"'()]*)(?<suffix>["')])/g;
const REACT_PACKAGE_RE = /@base-ui\/react(\/[A-Za-z0-9-]+)?/g;

async function main() {
  const pageFiles = await fg('**/page.mdx', {
    cwd: reactDocsRoot,
    absolute: true,
  });

  const orderByTarget = await buildOrderMap();

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  for (const pageFile of pageFiles.sort()) {
    const relativePageFile = path.relative(reactDocsRoot, pageFile);
    const outputFile = path.join(outputRoot, flattenPagePath(relativePageFile));
    const source = await fs.readFile(pageFile, 'utf8');
    const transformed = transformPage(source, {
      pageFile,
      relativePageFile,
      orderByTarget,
    });

    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, transformed);
  }
}

async function buildOrderMap() {
  const orderByTarget = new Map();

  for (const sectionId of SECTION_IDS) {
    const sectionFile = path.join(reactDocsRoot, sectionId, 'page.mdx');
    const source = await fs.readFile(sectionFile, 'utf8');
    const visible = getVisibleSource(source);
    const matches = visible.matchAll(/\[Full Docs\]\((\.\/[^)]+\/page\.mdx)\)/g);

    let order = 1;
    for (const match of matches) {
      const resolved = path.resolve(path.dirname(sectionFile), match[1]);
      const relative = path.relative(reactDocsRoot, resolved);
      const target = flattenPagePath(relative).replace(/\.mdx$/, '');
      orderByTarget.set(target, order);
      order += 1;
    }
  }

  return orderByTarget;
}

function transformPage(source, context) {
  const demoImports = [];
  let inFence = false;
  const lines = [];

  for (const line of source.split('\n')) {
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      lines.push(line);
      continue;
    }

    if (!inFence) {
      const demoImport = line.match(
        /^import\s+\{\s*(?<name>[A-Za-z0-9_]+)\s*\}\s+from\s+'(?<target>\.{1,2}\/[^']*demos\/[^']+)';\s*$/,
      );

      if (demoImport?.groups) {
        demoImports.push({
          name: demoImport.groups.name,
          path: toCanonicalDemoPath(
            path.resolve(path.dirname(context.pageFile), demoImport.groups.target),
          ),
        });
        continue;
      }

      if (
        line.trim() === "import { ReleaseTimeline } from 'docs/src/components/ReleaseTimeline';"
      ) {
        continue;
      }
    }

    lines.push(line);
  }

  let body = processOutsideCode(lines.join('\n'), (segment) => {
    let next = segment;

    for (const demoImport of [...demoImports].sort((a, b) => b.name.length - a.name.length)) {
      const tagRe = new RegExp(`<${demoImport.name}([\\s\\S]*?)\\/>`, 'g');
      next = next.replace(tagRe, (_, rawProps = '') => {
        const props = rawProps.trim().replace(/\s+/g, ' ');
        return props
          ? `<Demo path="${demoImport.path}" ${props} />`
          : `<Demo path="${demoImport.path}" />`;
      });
    }

    next = next.replace(PAGE_LINK_RE, (_, prefix, target, suffix) => {
      const href = toSolidHref(path.resolve(path.dirname(context.pageFile), target));
      return `${prefix}${href}${suffix}`;
    });

    next = next.replace(ABSOLUTE_REACT_LINK_RE, (_, prefix, target, suffix) => {
      const href = target ? `/solid/${target}` : '/solid';
      return `${prefix}${href}${suffix}`;
    });

    return next;
  });

  body = body.replace(REACT_PACKAGE_RE, (_, subpath = '') => `@msviderok/base-ui-solid${subpath}`);
  body = body.replace(/\n{3,}/g, '\n\n');

  const title = extractTitle(body);
  const description = extractDescription(body);
  const targetId = flattenPagePath(context.relativePageFile).replace(/\.mdx$/, '');
  const order = context.orderByTarget.get(targetId);

  const frontmatterLines = ['---'];

  if (title) {
    frontmatterLines.push(`title: ${JSON.stringify(title)}`);
  }

  if (description) {
    frontmatterLines.push(`description: ${JSON.stringify(description)}`);
  }

  if (order !== undefined) {
    frontmatterLines.push(`order: ${order}`);
  }

  frontmatterLines.push('---', '');

  return `${frontmatterLines.join('\n')}${body.trim()}\n`;
}

function processOutsideCode(source, transform) {
  const parts = [];
  const lines = source.split('\n');
  let inFence = false;
  let buffer = [];

  for (const line of lines) {
    if (FENCE_RE.test(line.trim())) {
      if (!inFence) {
        parts.push(transform(buffer.join('\n')));
        buffer = [];
      } else {
        parts.push(buffer.join('\n'));
        buffer = [];
      }

      inFence = !inFence;
      parts.push(line);
      continue;
    }

    buffer.push(line);
  }

  parts.push(inFence ? buffer.join('\n') : transform(buffer.join('\n')));
  return parts.join('\n');
}

function getVisibleSource(source) {
  return processOutsideCode(source, (segment) => segment);
}

function flattenPagePath(relativePageFile) {
  if (relativePageFile === 'page.mdx') {
    return 'index.mdx';
  }

  return relativePageFile.replace(/\/page\.mdx$/, '.mdx');
}

function toCanonicalDemoPath(resolvedImportPath) {
  const relative = path.relative(reactDocsRoot, resolvedImportPath);
  const parts = relative.split(path.sep);
  const demosIndex = parts.indexOf('demos');

  if (demosIndex === -1 || demosIndex === parts.length - 1) {
    throw new Error(`Unsupported demo import path: ${relative}`);
  }

  const section = parts[0];
  const pagePath = parts.slice(1, demosIndex);
  const demoPath = parts.slice(demosIndex + 1);

  if (section === 'components') {
    return normalizeDemoPath([...pagePath.slice(-1), ...demoPath].join('/'));
  }

  return normalizeDemoPath([section, ...pagePath, ...demoPath].join('/'));
}

function normalizeDemoPath(demoPath) {
  return demoPath.replace(/^\/+|\/+$/g, '');
}

function toSolidHref(resolvedPagePath) {
  const relative = path.relative(reactDocsRoot, resolvedPagePath);
  const flattened = flattenPagePath(relative).replace(/\.mdx$/, '');
  return flattened === 'index' ? '/solid' : `/solid/${flattened}`;
}

function extractTitle(source) {
  const match = source.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function extractDescription(source) {
  const metaMatch = source.match(
    /<Meta\s+name="description"\s+content="(?<content>[^"]+)"\s*\/>/,
  );

  if (metaMatch?.groups?.content) {
    return metaMatch.groups.content.trim();
  }

  const subtitleMatch = source.match(/<Subtitle>(?<content>[\s\S]*?)<\/Subtitle>/);
  return subtitleMatch?.groups?.content?.trim();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

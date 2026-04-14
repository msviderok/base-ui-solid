import type { DemoFile as ExportDemoFile } from '@/blocks/Demo';
import { createCodeSandbox } from '@/blocks/createCodeSandbox/createCodeSandbox';
import { createStackBlitzProject } from '@/blocks/createCodeSandbox/createStackBlitzProject';
import { GhostButton } from '@/components/solid/GhostButton';
import * as ScrollArea from '@/components/solid/ScrollArea';
import * as Select from '@/components/solid/Select';
import { CheckIcon } from '@/components/solid/icons/CheckIcon';
import { CopyIcon } from '@/components/solid/icons/CopyIcon';
import { ExternalLinkIcon } from '@/components/solid/icons/ExternalLinkIcon';
import { callEventHandler } from '@msviderok/base-ui-solid';
import { Tabs } from '@msviderok/base-ui-solid/tabs';
import { isEdge, isSafari, useTimeout } from '@msviderok/base-ui-solid/utils';
import clsx from 'clsx';
import {
  batch,
  createMemo,
  createResource,
  createSignal,
  For,
  mergeProps,
  Show,
  splitProps,
  type Component,
  type ComponentProps,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  demoManifest,
  type DemoVariantData,
  type DemoEntry as ManifestDemoEntry,
  type DemoFile as ManifestDemoFile,
} from 'virtual:demos-manifest';

const COLLAPSIBLE_LINES_THRESHOLD = 12;
const SOLID_JS_VERSION = '^1.9.8';
const TYPESCRIPT_VERSION = '^5.7.2';
const VITE_VERSION = '^6.0.3';
const VITE_PLUGIN_SOLID_VERSION = '^2.11.0';

const COMMIT_REF =
  typeof process !== 'undefined' && process.env.PULL_REQUEST_ID
    ? process.env.COMMIT_REF
    : undefined;
const SOURCE_CODE_REPO = typeof process !== 'undefined' ? process.env.SOURCE_CODE_REPO : undefined;

const demoLayoutCss = `
    <style>
      body {
        font-family: system-ui;
        margin: 0;
      }

      #root {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        padding: 3rem;
        isolation: isolate;
      }
    </style>
`;

const tailwindSetup = `
    <!-- Check out the Tailwind CSS installation guide for setup details: https://tailwindcss.com/docs/installation/framework-guides -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {},
        },
      }
    </script>
`;

const themeCss = `:root {
  --color-blue: oklch(45% 50% 264deg);
  --color-red: oklch(50% 55% 31deg);
  --color-gray-50: oklch(98% 0.25% 264deg);
  --color-gray-100: oklch(12% 9.5% 264deg / 5%);
  --color-gray-200: oklch(12% 9% 264deg / 7%);
  --color-gray-300: oklch(12% 8.5% 264deg / 17%);
  --color-gray-400: oklch(12% 8% 264deg / 38%);
  --color-gray-500: oklch(12% 7.5% 264deg / 50%);
  --color-gray-600: oklch(12% 7% 264deg / 67%);
  --color-gray-700: oklch(12% 6% 264deg / 77%);
  --color-gray-800: oklch(12% 5% 264deg / 85%);
  --color-gray-900: oklch(12% 5% 264deg / 90%);
  --color-gray-950: oklch(12% 5% 264deg / 95%);
  color-scheme: light dark;

  @media (prefers-color-scheme: dark) {
    --color-blue: oklch(69% 50% 264deg);
    --color-red: oklch(80% 55% 31deg);
    --color-gray-50: oklch(17% 0.25% 264deg);
    --color-gray-100: oklch(28% 0.75% 264deg / 65%);
    --color-gray-200: oklch(29% 0.75% 264deg / 80%);
    --color-gray-300: oklch(35% 0.75% 264deg / 80%);
    --color-gray-400: oklch(47% 0.875% 264deg / 80%);
    --color-gray-500: oklch(64% 1% 264deg / 80%);
    --color-gray-600: oklch(82% 1% 264deg / 80%);
    --color-gray-700: oklch(92% 1.125% 264deg / 80%);
    --color-gray-800: oklch(93% 0.875% 264deg / 85%);
    --color-gray-900: oklch(95% 0.5% 264deg / 90%);
    --color-gray-950: oklch(94% 0.375% 264deg / 95%);
  }
}
`;

const variantLabels: Record<string, string> = {
  default: 'Default',
  system: 'MUI System',
  css: 'Plain CSS',
  'css-modules': 'CSS Modules',
  tailwind: 'Tailwind CSS',
};

interface Props {
  path: string;
  class?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  showExtraPlaygroundLink?: boolean;
}

function CodeBlockRoot(componentProps: ComponentProps<typeof ScrollArea.Root>) {
  const [local, props] = splitProps(componentProps, ['class', 'onKeyDown']);

  return (
    <ScrollArea.Root
      class={clsx('DemoCodeBlockRoot', local.class)}
      tabIndex={-1}
      onKeyDown={(event) => {
        callEventHandler(local.onKeyDown, event);

        if (
          event.key.toLowerCase() === 'a' &&
          (event.metaKey || event.ctrlKey) &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          window.getSelection()?.selectAllChildren(event.currentTarget);
        }
      }}
      {...props}
    />
  );
}

function getDisplayFileName(filePath: string) {
  return filePath.split('/').at(-1) ?? filePath;
}

function getFileLanguage(filePath: string) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    return 'tsx';
  }
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    return 'jsx';
  }
  if (filePath.endsWith('.json')) {
    return 'json';
  }
  if (filePath.endsWith('.html')) {
    return 'html';
  }
  if (filePath.endsWith('.css')) {
    return 'css';
  }
  if (filePath.endsWith('.mdx')) {
    return 'mdx';
  }

  return 'text';
}

function getDemoLanguage(files: ExportDemoFile[]) {
  const entryFile = files[0]?.name ?? '';
  return entryFile.endsWith('.js') || entryFile.endsWith('.jsx') ? 'js' : 'ts';
}

function getVariantLabel(variantName: string) {
  return variantLabels[variantName] ?? humanizeLabel(variantName);
}

function humanizeLabel(value: string) {
  return value
    .split(/[-_/]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getDemoTitle(path: string) {
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments.at(-1) ?? 'example';
  const titleSegment =
    lastSegment === 'hero' || lastSegment === 'tailwind' || lastSegment === 'css-modules'
      ? (segments.at(-2) ?? lastSegment)
      : lastSegment;

  return `Base UI ${humanizeLabel(titleSegment)} example`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function highlightStaticFile(content: string) {
  const lines = escapeHtml(content)
    .split('\n')
    .map((line) => `<span class="line">${line || ' '}</span>`)
    .join('');

  return `<pre class="shiki css"><code><span class="frame" data-lined="">${lines}</span></code></pre>`;
}

function collectTailwindClasses(files: ExportDemoFile[]) {
  const classes = new Set<string>();

  files.forEach((file) => {
    for (const match of file.content.matchAll(/class="(.+?)"/gs)) {
      match[1]
        .split(/\s+/)
        .map((className) => className.trim())
        .filter(Boolean)
        .forEach(classes.add);
    }
  });

  return Array.from(classes).join(' ');
}

function resolveDependencies(packageName: string): Record<string, string> {
  switch (packageName) {
    case '@msviderok/base-ui-solid': {
      if (
        COMMIT_REF === undefined ||
        SOURCE_CODE_REPO !== 'https://github.com/msviderok/base-ui-solid'
      ) {
        return { '@msviderok/base-ui-solid': 'latest' };
      }

      return {
        '@msviderok/base-ui-solid': `https://pkg.csb.dev/msviderok/base-ui-solid/commit/${COMMIT_REF.slice(0, 8)}/@msviderok/base-ui-solid`,
      };
    }

    default:
      return { [packageName]: 'latest' };
  }
}

export default function DemoShell(componentProps: Props) {
  const props = mergeProps(
    { defaultOpen: false, compact: false, showExtraPlaygroundLink: false } as Props,
    componentProps,
  );

  const copyTimeout = useTimeout();

  const normalizedPath = () => props.path.replace(/^\/+|\/+$/g, '');
  const demo = () => demoManifest[normalizedPath()];
  const [demoEntry] = createResource(
    normalizedPath,
    async (path): Promise<ManifestDemoEntry | null> => {
      const entry = demoManifest[path];

      if (!entry) {
        return null;
      }

      const mod = await entry.load();
      return mod.default;
    },
  );
  const [variant, setVariant] = createSignal('');
  const [filePath, setFilePath] = createSignal('index.tsx');
  const [expanded, setExpanded] = createSignal(props.defaultOpen);
  const [copied, setCopied] = createSignal(false);

  const hasDemo = () => Boolean(demo());
  const hasLoadedDemo = () => Boolean(demoEntry());
  const variantNames = createMemo(() => demo()?.variants ?? []);
  const currentVariant = createMemo(() => variant() || variantNames()[0] || '');
  const currentVariantData = createMemo<DemoVariantData | undefined>(() => {
    const entry = demoEntry();
    const variantName = currentVariant();

    if (!entry || !variantName) {
      return undefined;
    }

    const data = entry[variantName];
    return Array.isArray(data) ? undefined : data;
  });
  const currentFiles = createMemo<Record<string, ManifestDemoFile>>(() => {
    const files = currentVariantData()?.files ?? {};

    if (currentVariant() !== 'css-modules') {
      return files;
    }

    return {
      ...files,
      'theme.css': {
        raw: themeCss,
        highlighted: highlightStaticFile(themeCss),
      },
    };
  });
  const fileEntries = createMemo(() =>
    Object.keys(currentFiles()).map((path) => ({
      key: path,
      label: getDisplayFileName(path),
    })),
  );
  const currentFilePath = createMemo(() => {
    const files = fileEntries();

    if (files.length === 0) {
      return 'index.tsx';
    }

    return files.some((entry) => entry.key === filePath()) ? filePath() : files[0].key;
  });
  const currentFile = createMemo(() => currentFiles()[currentFilePath()]);
  const currentFileLabel = createMemo(() => getDisplayFileName(currentFilePath()));
  const currentFileLineCount = createMemo(() => currentFile()?.raw.split('\n').length ?? 0);
  const shouldCollapse = createMemo(() => currentFileLineCount() >= COLLAPSIBLE_LINES_THRESHOLD);
  const showCollapsedPreview = createMemo(() => shouldCollapse() && !expanded() && !props.compact);
  const shouldRenderCodeViewport = createMemo(
    () => !shouldCollapse() || expanded() || !props.compact,
  );
  const shouldShowToolbar = createMemo(() => (props.compact ? expanded() : true));
  const variantOptions = createMemo<Record<string, string>>(() =>
    Object.fromEntries(variantNames().map((name) => [name, getVariantLabel(name)])),
  );
  const exportDemoFiles = createMemo<ExportDemoFile[]>(() => {
    return fileEntries().map(({ key, label }) => ({
      path: key,
      name: label,
      content: currentFiles()[key].raw,
      prettyContent: currentFiles()[key].highlighted,
      type: getFileLanguage(key),
    }));
  });
  const playgroundButtonLabel = createMemo(() =>
    isSafari || isEdge ? 'CodeSandbox' : 'StackBlitz',
  );
  const DemoComponent = createMemo<Component<{}> | undefined>(
    () => currentVariantData()?.Component,
  );

  const openPlayground = () => {
    const files = exportDemoFiles();

    if (files.length === 0) {
      return;
    }

    let additionalHtmlHeadContent = demoLayoutCss;

    if (currentVariant() === 'tailwind') {
      additionalHtmlHeadContent += tailwindSetup;

      const classList = collectTailwindClasses(files);
      if (classList) {
        additionalHtmlHeadContent += `

    <!-- Inject classes used so Tailwind loaded from the CDN can pre-render them. -->
    <!-- This is for the CodeSandbox and StackBlitz examples only. -->
    <meta name="custom" class="${classList}" />`;
      }
    } else if (currentVariant() === 'css-modules') {
      additionalHtmlHeadContent += `
    <link rel="stylesheet" href="theme.css" />`;
    }

    const exportOptions = {
      additionalHtmlHeadContent,
      demoFiles: files,
      demoLanguage: getDemoLanguage(files),
      dependencies: {
        'solid-js': SOLID_JS_VERSION,
      },
      dependencyResolver: resolveDependencies,
      description: `Solid example for ${normalizedPath()}.`,
      devDependencies: {
        typescript: TYPESCRIPT_VERSION,
        vite: VITE_VERSION,
        'vite-plugin-solid': VITE_PLUGIN_SOLID_VERSION,
      },
      onAddingFile: (fileName: string, content: string): [string, string] | null => {
        if (fileName === 'theme.css') {
          return ['public/theme.css', content];
        }

        return null;
      },
      title: getDemoTitle(normalizedPath()),
    } as const;

    if (isSafari || isEdge) {
      createCodeSandbox(exportOptions);
      return;
    }

    createStackBlitzProject(exportOptions);
  };

  const handleCopy = async () => {
    const text = currentFile()?.raw ?? '';

    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    copyTimeout.start(2000, () => setCopied(false));
  };

  return (
    <div class={clsx('DemoRoot', props.class)} data-compact={props.compact || undefined}>
      <div class="DemoPlayground">
        <div class="DemoPlaygroundInner" data-demo={currentVariant() || 'tailwind'}>
          <Show
            when={hasDemo()}
            fallback={
              <div class="DemoUnavailable">
                <strong>Demo not available yet.</strong>
                <span>
                  The Solid version of <code>{normalizedPath()}</code> still needs to be ported.
                </span>
              </div>
            }
          >
            <Show
              when={DemoComponent()}
              fallback={<span class="text-gray-400 text-sm">Loading demo…</span>}
            >
              {(ComponentToRender) => <Dynamic component={ComponentToRender()} />}
            </Show>
          </Show>
        </div>

        <Show when={props.showExtraPlaygroundLink && hasDemo() && hasLoadedDemo()}>
          <GhostButton
            class="absolute top-3 right-4.5 z-10"
            aria-label={`Open in ${playgroundButtonLabel()}`}
            onClick={openPlayground}
          >
            {playgroundButtonLabel()}
            <ExternalLinkIcon />
          </GhostButton>
        </Show>
      </div>

      <Show when={hasDemo() && hasLoadedDemo()}>
        <div role="figure" aria-label="Component demo code">
          <Show when={shouldShowToolbar()}>
            <div class="DemoToolbar">
              <Show
                when={fileEntries().length > 1}
                fallback={<div class="DemoFilename">{currentFileLabel()}</div>}
              >
                <Tabs.Root
                  value={currentFilePath()}
                  onValueChange={(value) => {
                    batch(() => {
                      setFilePath(String(value));
                      setExpanded(true);
                    });
                  }}
                >
                  <Tabs.List class="DemoTabsList" aria-label="Files">
                    <For each={fileEntries()}>
                      {(entry) => (
                        <Tabs.Tab class="DemoTab" value={entry.key}>
                          {entry.label}
                        </Tabs.Tab>
                      )}
                    </For>
                  </Tabs.List>
                </Tabs.Root>
              </Show>

              <div class="DemoToolbarActions">
                <Show when={variantNames().length > 1}>
                  <Select.Root
                    items={variantOptions()}
                    value={currentVariant()}
                    onValueChange={(value) => {
                      if (typeof value !== 'string') {
                        return;
                      }

                      batch(() => {
                        setVariant(value);
                        setFilePath('index.tsx');
                        setExpanded(true);
                      });
                    }}
                  >
                    <Select.Trigger aria-label="Styling method" />
                    <Select.Popup>
                      <For each={variantNames()}>
                        {(variantName) => (
                          <Select.Item value={variantName}>
                            {getVariantLabel(variantName)}
                          </Select.Item>
                        )}
                      </For>
                    </Select.Popup>
                  </Select.Root>
                </Show>

                <GhostButton
                  aria-label={`Open in ${playgroundButtonLabel()}`}
                  onClick={openPlayground}
                >
                  {playgroundButtonLabel()}
                  <ExternalLinkIcon />
                </GhostButton>

                <GhostButton aria-label="Copy code" onClick={handleCopy}>
                  Copy
                  <span class="flex size-3.5 items-center justify-center">
                    {copied() ? <CheckIcon /> : <CopyIcon />}
                  </span>
                </GhostButton>
              </div>
            </div>
          </Show>

          <Show when={shouldRenderCodeViewport()}>
            <CodeBlockRoot data-closed={showCollapsedPreview() ? '' : undefined}>
              <ScrollArea.Viewport
                aria-hidden={shouldCollapse() && !expanded()}
                class="DemoCodeBlockViewport"
                data-closed={showCollapsedPreview() ? '' : undefined}
              >
                <div
                  class="DemoSourceBrowser"
                  data-language={getFileLanguage(currentFilePath())}
                  // eslint-disable-next-line solid/no-innerhtml
                  innerHTML={currentFile()?.highlighted ?? ''}
                />
              </ScrollArea.Viewport>

              <Show when={!showCollapsedPreview()}>
                <ScrollArea.Corner />
                <ScrollArea.Scrollbar orientation="vertical" />
                <ScrollArea.Scrollbar orientation="horizontal" />
              </Show>
            </CodeBlockRoot>
          </Show>

          <Show when={shouldCollapse()}>
            <button
              type="button"
              class="DemoCollapseButton"
              data-sticky={expanded() ? '' : undefined}
              aria-expanded={expanded()}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded() ? 'Hide' : 'Show'} code
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}

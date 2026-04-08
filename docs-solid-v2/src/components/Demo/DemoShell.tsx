import { createSignal, For, Show, type Component } from 'solid-js';
import { demoComponents, demoData } from 'virtual:demos';
import clsx from 'clsx';

interface Props {
  path: string;
  defaultOpen?: boolean;
}

export function DemoShell(props: Props) {
  const demo = () => demoData[props.path];
  const variants = () => demo()?.variants ?? [];
  const [variant, setVariant] = createSignal<string>('');
  const [file, setFile] = createSignal<string>('index.tsx');
  const [expanded, setExpanded] = createSignal(props.defaultOpen ?? false);
  const [copied, setCopied] = createSignal(false);

  // Initialize variant once demo data is available
  const currentVariant = () => variant() || variants()[0] || '';
  const variantData = () => (demo() as any)?.[currentVariant()];
  const Component = () => {
    const vd = variantData();
    if (!vd) return null;
    return demoComponents[vd.componentIndex] as Component<{}>;
  };
  const files = () => variantData()?.files ?? {};
  const fileNames = () => Object.keys(files());
  const currentFile = () => files()[file()] ?? files()['index.tsx'];

  function handleCopy() {
    const raw = currentFile()?.raw ?? '';
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="DemoRoot">
      {/* Live playground */}
      <div class="DemoPlayground">
        <div class="DemoPlaygroundInner" data-demo={currentVariant() || 'tailwind'}>
          <Show when={Component()} fallback={<span class="text-gray-400 text-sm">Loading demo…</span>}>
            {(C) => <C />}
          </Show>
        </div>
      </div>

      {/* Toolbar */}
      <div class="DemoToolbar">
        {/* File tabs */}
        <div class="DemoTabsList">
          <For each={fileNames()}>
            {(fname) => (
              <button
                type="button"
                class={clsx('DemoTab', fname === file() && '[data-active]')}
                data-active={fname === file() ? '' : undefined}
                onClick={() => {
                  setFile(fname);
                  setExpanded(true);
                }}
              >
                {fname}
              </button>
            )}
          </For>
        </div>

        <div class="DemoToolbarActions">
          {/* Variant selector */}
          <Show when={variants().length > 1}>
            <For each={variants()}>
              {(v) => (
                <button
                  type="button"
                  class={clsx('DemoTab', v === currentVariant() && '[data-active]')}
                  data-active={v === currentVariant() ? '' : undefined}
                  onClick={() => {
                    setVariant(v);
                    setFile('index.tsx');
                    setExpanded(true);
                  }}
                >
                  {v === 'css-modules' ? 'CSS Modules' : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              )}
            </For>
          </Show>

          {/* Copy button */}
          <button
            type="button"
            class="GhostButton"
            aria-label="Copy code"
            onClick={handleCopy}
          >
            {copied() ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code block */}
      <div class={clsx('DemoCodeBlockRoot', !expanded() && '[data-closed]')}>
        <div class={clsx('DemoCodeBlockViewport', !expanded() && '[data-closed]')}>
          <div
            class="DemoSourceBrowser"
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={currentFile()?.highlighted ?? ''}
          />
        </div>

        {/* Collapse/expand button */}
        <button
          type="button"
          class="DemoCollapseButton"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded()}
        >
          {expanded() ? 'Collapse' : 'Expand'}
        </button>
      </div>
    </div>
  );
}

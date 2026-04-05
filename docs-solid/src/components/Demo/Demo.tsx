import { Collapsible } from '@msviderok/base-ui-solid/collapsible';
import type { ContentProps } from '@mui/internal-docs-infra/CodeHighlighter/types';
import { useDemo } from '@mui/internal-docs-infra/useDemo';
import { useLocation } from '@solidjs/router';
import clsx from 'clsx';
import * as BaseDemo from 'docs-solid/src/blocks/Demo';
import { CheckIcon } from 'docs-solid/src/icons/CheckIcon';
import { CopyIcon } from 'docs-solid/src/icons/CopyIcon';
import { createSignal, splitProps, type ComponentProps } from 'solid-js';
import { GhostButton } from '../GhostButton';
import { CodeSandboxLink } from './CodeSandboxLink';
import { DemoCodeBlock } from './DemoCodeBlock';
import { DemoFileSelector } from './DemoFileSelector';
import { DemoPlayground } from './DemoPlayground';
import { DemoVariantSelector } from './DemoVariantSelector';

export interface DemoProps extends ComponentProps<typeof BaseDemo.Root> {
  variants: BaseDemo.DemoVariant[];
  defaultOpen?: boolean;
  compact?: boolean;
}

export function Demo(componentProps: DemoProps) {
  const [local, props] = splitProps(componentProps, ['defaultOpen', 'compact', 'class', 'title']);
  const defaultOpen = () => local.defaultOpen ?? false;
  const compact = () => local.compact ?? false;

  const [open, setOpen] = createSignal(defaultOpen());
  const [copyTimeout, setCopyTimeout] = createSignal(0);
  const expandCollapsible = () => setOpen(true);

  return (
    <BaseDemo.Root class={clsx('DemoRoot', local.class)} {...props}>
      <DemoPlayground />
      <Collapsible.Root open={open()} onOpenChange={setOpen}>
        <div role="figure" aria-label="Component demo code">
          {(compact() ? open() : true) && (
            <div class="DemoToolbar">
              <DemoFileSelector onTabChange={expandCollapsible} />

              <div class="ml-auto flex items-center gap-4">
                <DemoVariantSelector class="contents" onVariantChange={expandCollapsible} />
                <CodeSandboxLink title="Base UI example" description="Base UI example" />
                <BaseDemo.SourceCopy
                  aria-label="Copy code"
                  render={(p) => <GhostButton {...p()} />}
                  onCopied={() => {
                    /* eslint-disable no-restricted-syntax */
                    const newTimeout = window.setTimeout(() => {
                      window.clearTimeout(newTimeout);
                      setCopyTimeout(0);
                    }, 2000);
                    window.clearTimeout(copyTimeout());
                    setCopyTimeout(newTimeout);
                    /* eslint-enable no-restricted-syntax */
                  }}
                >
                  Copy
                  <span class="flex size-3.5 items-center justify-center">
                    {copyTimeout() ? <CheckIcon /> : <CopyIcon />}
                  </span>
                </BaseDemo.SourceCopy>
              </div>
            </div>
          )}

          <DemoCodeBlock collapsibleOpen={open()} compact={compact()} />
        </div>
      </Collapsible.Root>
    </BaseDemo.Root>
  );
}

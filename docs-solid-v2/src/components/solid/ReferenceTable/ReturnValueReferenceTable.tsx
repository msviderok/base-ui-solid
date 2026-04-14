import { createMdxComponent } from '@/lib/mdx/createMdxComponent';
import { rehypeSyntaxHighlighting } from '@/lib/syntax-highlighting';
import type { EvaluateOptions } from '@mdx-js/mdx';
import clsx from 'clsx';
import { createMemo, For, Show } from 'solid-js';
import * as Accordion from '../Accordion';
import * as Table from '../Table';
import { TableCode } from '../TableCode';
import type { PropDef } from './types';

interface Props {
  data: Record<string, PropDef>;
  name?: string;
  class?: string;
}

const TYPE_MDX_OPTIONS = {
  rehypePlugins: rehypeSyntaxHighlighting,
  useMDXComponents: () => ({
    code: TableCode,
  }),
};

const DESCRIPTION_MDX_OPTIONS = {
  rehypePlugins: rehypeSyntaxHighlighting,
  useMDXComponents: () => ({
    code: (codeProps: Record<string, unknown>) => (
      <code class="Code data-inline:mx-[0.1em]" {...codeProps} />
    ),
  }),
};

function getDescription(def: PropDef, name: string, includeName: boolean) {
  const baseDescription = [def.description, def.example].filter(Boolean).join('\n\n');
  if (!includeName) {
    return baseDescription;
  }

  const nameLabel = `**${name}**`;
  return baseDescription ? `${nameLabel}: ${baseDescription}` : nameLabel;
}

function Comp(props: { value: string; options: Partial<Record<keyof EvaluateOptions, unknown>> }) {
  return <>{createMdxComponent(props.value, props.options)}</>;
}

export default function ReturnValueReferenceTable(props: Props) {
  const entries = createMemo(() => Object.entries(props.data));
  const includeName = entries.length > 1;

  return (
    <>
      <Accordion.Root class={clsx(props.class, 'xs:hidden')}>
        <Accordion.HeaderRow>
          <Accordion.HeaderCell class="pl-3">Type</Accordion.HeaderCell>
        </Accordion.HeaderRow>
        <For each={entries()}>
          {(entry, index) => (
            <Accordion.Item>
              <Accordion.Trigger index={index()}>
                <Show
                  when={entry[1].type ?? entry[1].detailedType}
                  fallback={<TableCode class="text-(--syntax-nullish)">—</TableCode>}
                >
                  {(typeValue) => <Comp value={`\`${typeValue()}\``} options={TYPE_MDX_OPTIONS} />}
                </Show>
                <svg
                  class="AccordionIcon ml-auto mr-1"
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M1 3.5L5 7.5L9 3.5" stroke="currentcolor" />
                </svg>
              </Accordion.Trigger>
              <Accordion.Panel>
                <Accordion.Content class="flex flex-col gap-3 p-4 text-md text-pretty">
                  <Show
                    when={getDescription(entry[1], entry[0], includeName)}
                    fallback={<TableCode class="text-(--syntax-nullish)">—</TableCode>}
                  >
                    {(descriptionText) => (
                      <Comp value={descriptionText()} options={DESCRIPTION_MDX_OPTIONS} />
                    )}
                  </Show>
                </Accordion.Content>
              </Accordion.Panel>
            </Accordion.Item>
          )}
        </For>
      </Accordion.Root>
      <Table.Root class={clsx('hidden xs:block', props.class)}>
        <Table.Head>
          <Table.Row>
            <Table.ColumnHeader class="xs:w-2/5">Type</Table.ColumnHeader>
            <Table.ColumnHeader class="xs:w-3/5">
              <span class="sr-only xs:not-sr-only xs:contents">Description</span>
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <For each={entries()}>
            {(entry) => (
              <Table.Row>
                <Table.Cell>
                  <Show
                    when={entry[1].type ?? entry[1].detailedType}
                    fallback={<TableCode class="text-(--syntax-nullish)">—</TableCode>}
                  >
                    {(typeValue) => (
                      <Comp value={`\`${typeValue()}\``} options={TYPE_MDX_OPTIONS} />
                    )}
                  </Show>
                </Table.Cell>
                <Table.Cell>
                  <Show
                    when={getDescription(entry[1], entry[0], includeName)}
                    fallback={<TableCode class="text-(--syntax-nullish)">—</TableCode>}
                  >
                    {(descriptionText) => (
                      <Comp value={descriptionText()} options={DESCRIPTION_MDX_OPTIONS} />
                    )}
                  </Show>
                </Table.Cell>
              </Table.Row>
            )}
          </For>
        </Table.Body>
      </Table.Root>
    </>
  );
}

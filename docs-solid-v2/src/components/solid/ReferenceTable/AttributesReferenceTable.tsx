import { createMdxComponent } from '@/lib/mdx/createMdxComponent';
import { rehypeSyntaxHighlighting } from '@/lib/syntax-highlighting';
import clsx from 'clsx';
import { createMemo, For } from 'solid-js';
import * as Accordion from '../Accordion';
import * as Table from '../Table';
import { TableCode } from '../TableCode';
import type { AttributeDef } from './types';

interface Props {
  data: Record<string, AttributeDef>;
  name?: string;
  class?: string;
}

const CREATE_MDX_OPTIONS = {
  rehypePlugins: rehypeSyntaxHighlighting,
  useMDXComponents: () => ({
    code: (codeProps: Record<string, unknown>) => (
      <code class="Code data-inline:mx-[0.1em]" {...codeProps} />
    ),
  }),
};

export default function AttributesReferenceTable(props: Props) {
  const entries = createMemo(() => Object.entries(props.data));
  return (
    <>
      <Accordion.Root class={clsx(props.class, 'xs:hidden')}>
        <Accordion.HeaderRow>
          <Accordion.HeaderCell class="pl-3">Attribute</Accordion.HeaderCell>
        </Accordion.HeaderRow>
        <For each={entries()}>
          {(entry, index) => {
            const AttributeDescription = createMdxComponent(
              entry[1].description ?? '',
              CREATE_MDX_OPTIONS,
            );

            return (
              <Accordion.Item>
                <Accordion.Trigger index={index()}>
                  <TableCode class="text-navy">{entry[0]}</TableCode>
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
                    <AttributeDescription />
                  </Accordion.Content>
                </Accordion.Panel>
              </Accordion.Item>
            );
          }}
        </For>
      </Accordion.Root>
      <Table.Root class={clsx('hidden xs:block', props.class)}>
        <Table.Head>
          <Table.Row>
            <Table.ColumnHeader class="w-full xs:w-48 sm:w-56 md:w-[calc(5/16.5*100%)]">
              Attribute
            </Table.ColumnHeader>
            <Table.ColumnHeader class="xs:w-2/3 md:w-[calc(11.5/16.5*100%)]">
              <span class="sr-only xs:not-sr-only xs:contents">Description</span>
            </Table.ColumnHeader>
            <Table.ColumnHeader class="w-10 max-xs:hidden" aria-hidden>
              <span class="invisible">-</span>
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <For each={entries()}>
            {(entry) => {
              const AttributeDescription = createMdxComponent(
                entry[1].description ?? '',
                CREATE_MDX_OPTIONS,
              );

              return (
                <Table.Row>
                  <Table.RowHeader>
                    <TableCode class="text-navy">{entry[0]}</TableCode>
                  </Table.RowHeader>
                  <Table.Cell colSpan={2}>
                    <AttributeDescription />
                  </Table.Cell>
                </Table.Row>
              );
            }}
          </For>
        </Table.Body>
      </Table.Root>
    </>
  );
}

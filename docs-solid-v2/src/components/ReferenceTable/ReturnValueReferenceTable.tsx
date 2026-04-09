import clsx from 'clsx';
import { createMdxComponent } from '../../mdx/createMdxComponent';
import { rehypeSyntaxHighlighting } from '../../syntax-highlighting';
import * as Accordion from '../Accordion';
import { Code } from '../Code';
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
      <Code class="data-[inline]:mx-[0.1em]" {...codeProps} />
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

export function ReturnValueReferenceTable(props: Props) {
  const entries = Object.entries(props.data);
  const includeName = entries.length > 1;

  return (
    <>
      <Accordion.Root class={clsx(props.class, 'xs:hidden')}>
        <Accordion.HeaderRow>
          <Accordion.HeaderCell class="pl-3">Type</Accordion.HeaderCell>
        </Accordion.HeaderRow>
        {entries.map(([name, def], index) => {
          const typeValue = def.type ?? def.detailedType;
          const descriptionText = getDescription(def, name, includeName);
          const ReturnType = typeValue
            ? createMdxComponent(`\`${typeValue}\``, TYPE_MDX_OPTIONS)
            : null;
          const ReturnDescription = descriptionText
            ? createMdxComponent(descriptionText, DESCRIPTION_MDX_OPTIONS)
            : null;

          return (
            <Accordion.Item key={name}>
              <Accordion.Trigger index={index}>
                {ReturnType ? (
                  <ReturnType />
                ) : (
                  <TableCode class="text-(--syntax-nullish)">—</TableCode>
                )}
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
                  {ReturnDescription ? (
                    <ReturnDescription />
                  ) : (
                    <TableCode class="text-(--syntax-nullish)">—</TableCode>
                  )}
                </Accordion.Content>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
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
          {entries.map(([name, def]) => {
            const typeValue = def.type ?? def.detailedType;
            const descriptionText = getDescription(def, name, includeName);
            const ReturnType = typeValue
              ? createMdxComponent(`\`${typeValue}\``, TYPE_MDX_OPTIONS)
              : null;
            const ReturnDescription = descriptionText
              ? createMdxComponent(descriptionText, DESCRIPTION_MDX_OPTIONS)
              : null;

            return (
              <Table.Row key={name}>
                <Table.Cell>
                  {ReturnType ? (
                    <ReturnType />
                  ) : (
                    <TableCode class="text-(--syntax-nullish)">—</TableCode>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {ReturnDescription ? (
                    <ReturnDescription />
                  ) : (
                    <TableCode class="text-(--syntax-nullish)">—</TableCode>
                  )}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </>
  );
}

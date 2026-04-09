import { visuallyHidden } from '@base-ui/utils/visuallyHidden';
import clsx from 'clsx';
import { createMdxComponent } from '../../mdx/createMdxComponent';
import { rehypeSyntaxHighlighting } from '../../syntax-highlighting';
import { Code } from '../Code';
import { TableCode, type TableCodeProps } from '../TableCode';
import * as Accordion from '../Accordion';
import * as DescriptionList from '../DescriptionList';
import * as ReferenceTableTooltip from './ReferenceTableTooltip';
import type { PropDef } from './types';

function ExpandedCode(props: { class?: string; [key: string]: unknown }) {
  const className = String(props.class ?? '')
    .split(' ')
    .filter((name) => name !== 'Code')
    .join(' ');

  return <code {...props} class={className} />;
}

function ExpandedPre(props: Record<string, unknown>) {
  return (
    <Accordion.Scrollable tag="div" gradientColor="var(--color-gray-50)">
      <pre {...props} class={`text-xs p-0 m-0 ${String(props.class ?? '')}`.trim()} />
    </Accordion.Scrollable>
  );
}

interface Props {
  data: Record<string, PropDef>;
  name: string;
  class?: string;
  renameFrom?: string;
  renameTo?: string;
  nameLabel?: string;
  caption?: string;
}

const TRIGGER_GRID_LAYOUT =
  'grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)_auto] xs:grid-cols-[12rem_minmax(0,1fr)_auto_auto] md:grid-cols-[minmax(12rem,5fr)_minmax(0,7fr)_minmax(8rem,4fr)_2.5rem]';
const PANEL_GRID_LAYOUT = 'xs:grid-cols-[12rem_minmax(0,1fr)]';

function getShortPropType(name: string, type: string | undefined) {
  if (/^(on|get)[A-Z].*/.test(name)) {
    return { type: 'function', detailedType: true };
  }

  if (type == null) {
    return { type: String(type), detailedType: false };
  }

  if (name === 'className') {
    return { type: 'string | function', detailedType: true };
  }

  if (name === 'style') {
    return { type: 'React.CSSProperties | function', detailedType: true };
  }

  if (name === 'render') {
    return { type: 'Element | function', detailedType: true };
  }

  if (
    name.endsWith('Ref') ||
    name === 'children' ||
    type === 'boolean' ||
    type === 'string' ||
    type === 'number' ||
    !type.includes(' | ') ||
    (type.split('|').length < 3 && type.length < 30)
  ) {
    return { type, detailedType: false };
  }

  return { type: 'Union', detailedType: true };
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceComponentPrefix(input: string | undefined, from?: string, to?: string) {
  if (!input || !from || !to) {
    return input ?? '';
  }

  const pattern = new RegExp(`\\b${escapeRegExp(from)}(?=\\.)`, 'g');
  return input.replace(pattern, to);
}

export function ReferenceAccordion(props: Props) {
  const captionId = `${props.name}-caption`;

  return (
    <Accordion.Root aria-describedby={captionId} class={props.class}>
      <span id={captionId} style={visuallyHidden} aria-hidden>
        {props.caption ?? 'Component props table'}
      </span>
      <Accordion.HeaderRow class={clsx('grid', TRIGGER_GRID_LAYOUT)}>
        <Accordion.HeaderCell>{props.nameLabel ?? 'Prop'}</Accordion.HeaderCell>
        <Accordion.HeaderCell class="max-xs:hidden">Type</Accordion.HeaderCell>
        <Accordion.HeaderCell class="max-md:hidden">Default</Accordion.HeaderCell>
        <Accordion.HeaderCell class="max-md:hidden w-10" />
      </Accordion.HeaderRow>
      {Object.entries(props.data).map(([name, prop], index) => {
        const displayType = replaceComponentPrefix(prop.type, props.renameFrom, props.renameTo);
        const detailedDisplayType = replaceComponentPrefix(
          prop.detailedType ?? prop.type,
          props.renameFrom,
          props.renameTo,
        );

        const PropType = createMdxComponent(`\`${displayType}\``, {
          rehypePlugins: rehypeSyntaxHighlighting,
          useMDXComponents: () => ({ code: TableCode }),
        });

        const PropDetailedType = createMdxComponent(`\`\`\`ts\n${detailedDisplayType}\n\`\`\``, {
          rehypePlugins: rehypeSyntaxHighlighting,
          useMDXComponents: () => ({
            code: ExpandedCode,
            figure: 'figure',
            pre: ExpandedPre,
          }),
        });

        const { type: shortPropTypeName, detailedType } = getShortPropType(name, displayType);
        const ShortPropType = createMdxComponent(`\`${shortPropTypeName}\``, {
          rehypePlugins: rehypeSyntaxHighlighting,
          useMDXComponents: () => ({
            code: (codeProps: TableCodeProps) => (
              <TableCode {...codeProps} printWidth={name === 'children' ? 999 : undefined} />
            ),
          }),
        });

        const PropDefault = createMdxComponent(`\`${prop.default}\``, {
          rehypePlugins: rehypeSyntaxHighlighting,
          useMDXComponents: () => ({ code: TableCode }),
        });

        const PropDescription = prop.description
          ? createMdxComponent(prop.description, {
              rehypePlugins: rehypeSyntaxHighlighting,
              useMDXComponents: () => ({
                code: (codeProps: Record<string, unknown>) => (
                  <Code class="data-[inline]:mx-[0.1em]" {...codeProps} />
                ),
              }),
            })
          : null;

        const ExampleSnippet = prop.example
          ? createMdxComponent(prop.example, {
              rehypePlugins: rehypeSyntaxHighlighting,
              useMDXComponents: () => ({
                code: (codeProps: Record<string, unknown>) => (
                  <Code class="data-[inline]:mx-[0.1em]" {...codeProps} />
                ),
              }),
            })
          : null;

        const id = `${props.name}-${name}`;
        const showExpandedType = Boolean(prop.detailedType) || detailedType;
        const DefaultValue = prop.required || prop.default === undefined ? null : PropDefault;

        return (
          <Accordion.Item key={name}>
            <Accordion.Trigger
              id={id}
              index={index}
              aria-label={`${props.nameLabel ?? 'Prop'}: ${name},${prop.required ? ' required,' : ''} type: ${shortPropTypeName}${prop.default !== undefined ? ` (default: ${prop.default})` : ''}`}
              class={clsx('min-h-min scroll-mt-12 p-0 md:scroll-mt-0', TRIGGER_GRID_LAYOUT)}
            >
              <Accordion.Scrollable class="px-3">
                <TableCode class="text-navy whitespace-nowrap">
                  {name}
                  {prop.required ? <sup class="top-[-0.3em] text-xs text-red-800">*</sup> : ''}
                </TableCode>
              </Accordion.Scrollable>
              {prop.type && (
                <Accordion.Scrollable class="px-3 flex items-baseline text-sm leading-none break-keep whitespace-nowrap max-xs:hidden">
                  {showExpandedType ? (
                    <ReferenceTableTooltip.Root disableHoverablePopup>
                      <ReferenceTableTooltip.Trigger render={<span />}>
                        <ShortPropType />
                      </ReferenceTableTooltip.Trigger>
                      <ReferenceTableTooltip.Popup>
                        {prop.detailedType ? <PropDetailedType /> : <PropType />}
                      </ReferenceTableTooltip.Popup>
                    </ReferenceTableTooltip.Root>
                  ) : (
                    <ShortPropType />
                  )}
                </Accordion.Scrollable>
              )}
              <Accordion.Scrollable class="max-md:hidden break-keep whitespace-nowrap px-3">
                {DefaultValue ? (
                  <DefaultValue />
                ) : (
                  <TableCode class="text-(--syntax-nullish)">—</TableCode>
                )}
              </Accordion.Scrollable>
              <span class="flex justify-center max-xs:ml-auto max-xs:mr-3">
                <svg
                  class="AccordionIcon translate-y-px"
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M1 3.5L5 7.5L9 3.5" stroke="currentcolor" />
                </svg>
              </span>
            </Accordion.Trigger>
            <Accordion.Panel>
              <Accordion.Content>
                <DescriptionList.Root
                  class={clsx('text-gray-600 max-xs:py-3', PANEL_GRID_LAYOUT)}
                  aria-label="Info"
                >
                  <DescriptionList.Item>
                    <DescriptionList.Term>Name</DescriptionList.Term>
                    <DescriptionList.Details>
                      <a href={`#${id}`} class="Link">
                        <TableCode class="text-(--color-blue)">{name}</TableCode>
                      </a>
                    </DescriptionList.Details>
                  </DescriptionList.Item>
                  {PropDescription && (
                    <DescriptionList.Item>
                      <DescriptionList.Term separator>Description</DescriptionList.Term>
                      <DescriptionList.Details class="[&_[role='figure']]:mt-1 [&_[role='figure']]:mb-1">
                        <PropDescription />
                      </DescriptionList.Details>
                    </DescriptionList.Item>
                  )}
                  <DescriptionList.Item>
                    <DescriptionList.Term separator>Type</DescriptionList.Term>
                    <DescriptionList.Details>
                      <PropDetailedType />
                    </DescriptionList.Details>
                  </DescriptionList.Item>
                  {DefaultValue && (
                    <DescriptionList.Item>
                      <DescriptionList.Term separator>Default</DescriptionList.Term>
                      <DescriptionList.Details>
                        <PropDefault />
                      </DescriptionList.Details>
                    </DescriptionList.Item>
                  )}
                  {ExampleSnippet && (
                    <DescriptionList.Item>
                      <DescriptionList.Term separator>Example</DescriptionList.Term>
                      <DescriptionList.Details class="*:my-0">
                        <ExampleSnippet />
                      </DescriptionList.Details>
                    </DescriptionList.Item>
                  )}
                </DescriptionList.Root>
              </Accordion.Content>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}

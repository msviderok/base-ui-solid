import clsx from 'clsx';
import { children, createMemo, splitProps, type ComponentProps, type JSX } from 'solid-js';
import { getChildrenText } from '../utils/getChildrenText';
import { Code } from './Code';

interface TableCodeProps extends ComponentProps<'code'> {
  printWidth?: number;
}

export function TableCode(props: TableCodeProps) {
  const [local, rest] = splitProps(props, ['class', 'children', 'printWidth']);
  const safeChildren = children(() => local.children);
  const printWidth = () => local.printWidth ?? 40;
  const text = () => getChildrenText(local.children);

  const resolvedChildren = createMemo(() => {
    if (text().includes('|') && text().length > printWidth()) {
      const unionGroups: JSX.Element[][] = [];
      const parts = safeChildren.toArray();

      let parenDepth = 0;
      let braceDepth = 0;
      let groupIndex = 0;
      unionGroups.push([]);

      parts.forEach((child, index) => {
        const str = getChildrenText(child);

        str.split('(').forEach(() => {
          parenDepth += 1;
        });
        str.split(')').forEach(() => {
          parenDepth -= 1;
        });
        str.split('{').forEach(() => {
          braceDepth += 1;
        });
        str.split('}').forEach(() => {
          braceDepth -= 1;
        });

        if (str.trim() === '|' && parenDepth <= 0 && braceDepth <= 0 && index !== 0) {
          unionGroups.push([]);
          groupIndex += 1;
          return;
        }

        unionGroups[groupIndex].push(child);
      });

      if (unionGroups.length > 1) {
        const enhanced: JSX.Element[] = [];
        unionGroups.forEach((group, index) => {
          const pipe = <span style={{ color: 'var(--syntax-keyword)' }}>| </span>;
          if (index === 0) {
            enhanced.push(pipe);
          } else {
            enhanced.push(
              <>
                <br />
                {pipe}
              </>,
            );
          }
          enhanced.push(...group);
        });
        return enhanced;
      }
    }

    return safeChildren();
  });

  return (
    <Code data-table-code="" class={clsx('text-xs', local.class)} {...rest}>
      {resolvedChildren()}
    </Code>
  );
}

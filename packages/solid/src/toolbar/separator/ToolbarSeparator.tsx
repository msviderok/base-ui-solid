import { createMemo } from 'solid-js';
import { Separator } from '../../separator';
import type { BaseUIComponentProps } from '../../utils/types';
import type { ToolbarRoot } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarSeparator(props: ToolbarSeparator.Props) {
  const context = useToolbarRootContext();

  const orientation = createMemo(
    () =>
      (
        ({
          vertical: 'horizontal',
          horizontal: 'vertical',
        }) as Record<ToolbarRoot.Orientation, ToolbarRoot.Orientation>
      )[context.orientation()],
  );

  return <Separator orientation={orientation()} {...props} ref={props.ref} />;
}

export interface ToolbarSeparatorProps
  extends BaseUIComponentProps<'div', Separator.State>, Separator.Props {}

export namespace ToolbarSeparator {
  export type Props = ToolbarSeparatorProps;
}

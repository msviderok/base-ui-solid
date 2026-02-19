import { splitComponentProps } from '../solid-helpers';
import type { BaseUIComponentProps, Orientation } from '../utils/types';
import { useRenderElement } from '../utils/useRenderElement';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export function Separator(componentProps: Separator.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['orientation']);
  const orientation = () => local.orientation ?? 'horizontal';

  const state: Separator.State = {
    get orientation() {
      return orientation();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [
      {
        role: 'separator',
        get 'aria-orientation'() {
          return orientation();
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface SeparatorProps extends BaseUIComponentProps<'div', Separator.State> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}

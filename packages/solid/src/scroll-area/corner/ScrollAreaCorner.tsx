import { Show, type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';

/**
 * A small rectangular area that appears at the intersection of horizontal and vertical scrollbars.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaCorner(componentProps: ScrollAreaCorner.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);
  const { cornerRef, cornerSize, hiddenState } = useScrollAreaRootContext();

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      cornerRef.current = el;
    },
    props: [
      {
        get style(): JSX.CSSProperties {
          return {
            position: 'absolute',
            bottom: 0,
            'inset-inline-end': 0,
            width: `${cornerSize().width}px`,
            height: `${cornerSize().height}px`,
          };
        },
      },
      elementProps,
    ],
  });

  return <Show when={!hiddenState().corner}>{element()}</Show>;
}

export interface ScrollAreaCornerState {}

export interface ScrollAreaCornerProps extends BaseUIComponentProps<
  'div',
  ScrollAreaCorner.State
> {}

export namespace ScrollAreaCorner {
  export type State = ScrollAreaCornerState;
  export type Props = ScrollAreaCornerProps;
}

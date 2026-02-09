import type { JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useScrollAreaRootContext } from '../root/ScrollAreaRootContext';
import { useScrollAreaScrollbarContext } from '../scrollbar/ScrollAreaScrollbarContext';
import { ScrollAreaScrollbarCssVars } from '../scrollbar/ScrollAreaScrollbarCssVars';

/**
 * The draggable part of the the scrollbar that indicates the current scroll position.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
 */
export function ScrollAreaThumb(componentProps: ScrollAreaThumb.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const {
    refs,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    setScrollingX,
    setScrollingY,
  } = useScrollAreaRootContext();

  const { orientation } = useScrollAreaScrollbarContext();

  const state: ScrollAreaThumb.State = {
    get orientation() {
      return orientation();
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      if (orientation() === 'vertical') {
        refs.thumbYRef = el;
      } else {
        refs.thumbXRef = el;
      }
    },
    state,
    props: [
      {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp(event) {
          if (orientation() === 'vertical') {
            setScrollingY(false);
          }
          if (orientation() === 'horizontal') {
            setScrollingX(false);
          }
          handlePointerUp(event);
        },
        get style(): JSX.CSSProperties {
          return {
            ...(orientation() === 'vertical' && {
              height: `var(${ScrollAreaScrollbarCssVars.scrollAreaThumbHeight})`,
            }),
            ...(orientation() === 'horizontal' && {
              width: `var(${ScrollAreaScrollbarCssVars.scrollAreaThumbWidth})`,
            }),
          };
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface ScrollAreaThumbState {
  orientation?: 'horizontal' | 'vertical';
}

export interface ScrollAreaThumbProps extends BaseUIComponentProps<'div', ScrollAreaThumb.State> {}

export namespace ScrollAreaThumb {
  export type State = ScrollAreaThumbState;
  export type Props = ScrollAreaThumbProps;
}

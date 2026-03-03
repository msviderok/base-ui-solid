import { splitComponentProps } from '../../solid-helpers';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';

/**
 * Displays an element positioned against the popover anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverArrow(componentProps: PopoverArrow.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { store } = usePopoverRootContext();
  const open = store.useState('open');
  const { arrowRef, side, align, arrowUncentered, arrowStyles } = usePopoverPositionerContext();

  const state: PopoverArrow.State = {
    get open() {
      return open();
    },
    get side() {
      return side();
    },
    get align() {
      return align();
    },
    get uncentered() {
      return arrowUncentered();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      arrowRef.current = el;
    },
    props: [
      {
        get style() {
          return arrowStyles();
        },
        'aria-hidden': true,
      },
      elementProps,
    ],
    stateAttributesMapping: popupStateMapping,
  });

  return <>{element()}</>;
}

export interface PopoverArrowState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
}

export interface PopoverArrowProps extends BaseUIComponentProps<'div', PopoverArrow.State> {}

export namespace PopoverArrow {
  export type State = PopoverArrowState;
  export type Props = PopoverArrowProps;
}

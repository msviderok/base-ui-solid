import { splitComponentProps } from '../../solid-helpers';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import { useTooltipRootContext } from '../root/TooltipRootContext';

/**
 * Displays an element positioned against the tooltip anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipArrow(componentProps: TooltipArrow.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);
  const store = useTooltipRootContext();

  const instantType = store.useState('instantType');

  const { open, setArrowRef, side, align, arrowUncentered, arrowStyles } =
    useTooltipPositionerContext();

  const state: TooltipArrow.State = {
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
    get instant() {
      return instantType();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: setArrowRef,
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

export interface TooltipArrowState {
  /**
   * Whether the tooltip is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
  instant: 'delay' | 'focus' | 'dismiss' | undefined;
}

export interface TooltipArrowProps extends BaseUIComponentProps<'div', TooltipArrow.State> {}

export namespace TooltipArrow {
  export type State = TooltipArrowState;
  export type Props = TooltipArrowProps;
}

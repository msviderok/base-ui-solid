import { splitComponentProps } from '../../solid-helpers';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/**
 * Displays an element positioned against the anchor.
 * Renders a `<div>` element.
 */
export function ComboboxArrow(componentProps: ComboboxArrow.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const store = useComboboxRootContext();
  const { refs, side, align, arrowUncentered, arrowStyles } = useComboboxPositionerContext();

  const open = store.useState('open');

  const state: ComboboxArrow.State = {
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
    ref: (el) => {
      refs.arrowRef = el;
    },
    stateAttributesMapping: popupStateMapping,
    state,
    props: [
      {
        style: arrowStyles,
        'aria-hidden': true,
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface ComboboxArrowState {
  /**
   * Whether the popup is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
}

export interface ComboboxArrowProps extends BaseUIComponentProps<'div', ComboboxArrow.State> {}

export namespace ComboboxArrow {
  export type State = ComboboxArrowState;
  export type Props = ComboboxArrowProps;
}

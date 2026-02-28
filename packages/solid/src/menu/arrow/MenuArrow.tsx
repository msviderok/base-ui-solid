import { splitComponentProps } from '../../solid-helpers';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';

/**
 * Displays an element positioned against the menu anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuArrow(componentProps: MenuArrow.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { store } = useMenuRootContext();
  const { arrowRef, side, align, arrowUncentered, arrowStyles } = useMenuPositionerContext();
  const open = store.useState('open');

  const state: MenuArrow.State = {
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
      arrowRef.current = el;
    },
    stateAttributesMapping: popupStateMapping,
    state,
    props: [
      {
        'aria-hidden': true,
        get style() {
          return arrowStyles();
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface MenuArrowState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
}

export interface MenuArrowProps extends BaseUIComponentProps<'div', MenuArrow.State> {}

export namespace MenuArrow {
  export type State = MenuArrowState;
  export type Props = MenuArrowProps;
}

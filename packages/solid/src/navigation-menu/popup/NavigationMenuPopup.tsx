import { createMemo, type JSX } from 'solid-js';
import { useDirection } from '../../direction-provider/DirectionContext';
import { splitComponentProps } from '../../solid-helpers';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { Align, Side } from '../../utils/useAnchorPositioning';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { useNavigationMenuPositionerContext } from '../positioner/NavigationMenuPositionerContext';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

const stateAttributesMapping: StateAttributesMapping<NavigationMenuPopup.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
};

/**
 * A container for the navigation menu contents.
 * Renders a `<nav>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuPopup(componentProps: NavigationMenuPopup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;

  const { open, transitionStatus, setPopupElement } = useNavigationMenuRootContext();
  const positioning = useNavigationMenuPositionerContext();
  const direction = useDirection();

  const id = useBaseUiId(idProp);

  const state: NavigationMenuPopup.State = {
    get open() {
      return open();
    },
    get transitionStatus() {
      return transitionStatus();
    },
    get side() {
      return positioning.side();
    },
    get align() {
      return positioning.align();
    },
    get anchorHidden() {
      return positioning.anchorHidden();
    },
  };

  // Ensure popup size transitions correctly when anchored to `bottom` (side=top) or `right` (side=left).
  // TODO: this breaks the repositioning due to synchronious change of positioning.side(). Do not use for now.
  const calculatedStyles = createMemo(() => {
    const side = positioning.side();
    const dir = direction();

    let isOriginSide = side === 'top';
    let isPhysicalLeft = side === 'left';
    if (dir === 'rtl') {
      isOriginSide = isOriginSide || side === 'inline-end';
      isPhysicalLeft = isPhysicalLeft || side === 'inline-end';
    } else {
      isOriginSide = isOriginSide || side === 'inline-start';
      isPhysicalLeft = isPhysicalLeft || side === 'inline-start';
    }

    return { isOriginSide, isPhysicalLeft };
  });

  const element = useRenderElement('nav', componentProps, {
    state,
    ref: setPopupElement,
    props: [
      {
        get id() {
          return id();
        },
        tabIndex: -1,
        get style(): JSX.CSSProperties | undefined {
          return calculatedStyles().isOriginSide
            ? {
                position: 'absolute',
                [calculatedStyles().isOriginSide ? 'bottom' : 'top']: '0',
                [calculatedStyles().isPhysicalLeft ? 'right' : 'left']: '0',
              }
            : undefined;
        },
      },
      elementProps,
    ],
    stateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface NavigationMenuPopupState {
  /**
   * If `true`, the popup is open.
   */
  open: boolean;
  /**
   * The transition status of the popup.
   */
  transitionStatus: TransitionStatus;
  /**
   * The side of the anchor the popup is positioned on.
   */
  side: Side;
  /**
   * The alignment of the popup relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
}

export interface NavigationMenuPopupProps extends BaseUIComponentProps<
  'nav',
  NavigationMenuPopup.State
> {}

export namespace NavigationMenuPopup {
  export type State = NavigationMenuPopupState;
  export type Props = NavigationMenuPopupProps;
}

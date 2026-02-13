import { type JSX, createEffect, createMemo } from 'solid-js';
import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import {
  safePolygon,
  useClick,
  useHoverReferenceInteraction,
  useInteractions,
} from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { useTriggerRegistration } from '../../utils/popups';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { BaseUIComponentProps, NonNativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useMenuItem } from '../item/useMenuItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';

/**
 * A menu item that opens a submenu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuSubmenuTrigger(componentProps: MenuSubmenuTrigger.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'label',
    'id',
    'nativeButton',
    'openOnHover',
    'delay',
    'closeDelay',
    'disabled',
  ]);
  const idProp = () => local.id;
  const nativeButton = () => local.nativeButton ?? false;
  const openOnHover = () => local.openOnHover ?? true;
  const delay = () => local.delay ?? 100;
  const closeDelay = () => local.closeDelay ?? 0;
  const disabledProp = () => local.disabled ?? false;

  const listItem = useCompositeListItem();
  const menuPositionerContext = useMenuPositionerContext();

  const { store } = useMenuRootContext();

  const thisTriggerId = useBaseUiId(idProp);
  const open = store.useState('open');
  const floatingRootContext = store.select('floatingRootContext');
  const floatingTreeRoot = store.select('floatingTreeRoot');

  const baseRegisterTrigger = useTriggerRegistration(thisTriggerId, store);
  const registerTrigger = (element: Element | null | undefined) => {
    const cleanup = baseRegisterTrigger(element);

    if (element !== null && store.select('open') && store.select('activeTriggerId') == null) {
      store.update({
        activeTriggerId: thisTriggerId(),
        activeTriggerElement: element,
        closeDelay: closeDelay(),
      });
    }

    return cleanup;
  };

  let triggerElementRef = null as HTMLElement | null | undefined;
  const handleTriggerElementRef = (el: HTMLElement | null | undefined) => {
    triggerElementRef = el;
    store.set('activeTriggerElement', el);
  };

  const submenuRootContext = useMenuSubmenuRootContext();
  if (!submenuRootContext?.parentMenu) {
    throw new Error('Base UI: <Menu.SubmenuTrigger> must be placed in <Menu.SubmenuRoot>.');
  }

  createEffect(() => {
    store.useSyncedValue('closeDelay', closeDelay());
  });

  const parentMenuStore = submenuRootContext.parentMenu;

  const itemProps = parentMenuStore.useState('itemProps');
  const highlighted = () => parentMenuStore.useState('isActive', listItem.index())();

  const itemMetadata = () => ({
    type: 'submenu-trigger' as const,
    setActive: () => parentMenuStore.set('activeIndex', listItem.index()),
  });

  const rootDisabled = store.useState('disabled');
  const disabled = () => disabledProp() || rootDisabled();

  const { getItemProps, setItemRef } = useMenuItem({
    closeOnClick: false,
    disabled,
    highlighted,
    id: thisTriggerId,
    store,
    nativeButton,
    itemMetadata,
    nodeId: menuPositionerContext?.nodeId,
  });

  const hoverEnabled = store.useState('hoverEnabled');
  const allowMouseEnter = store.useState('allowMouseEnter');

  const hoverProps = useHoverReferenceInteraction(floatingRootContext, {
    enabled: () => hoverEnabled() && openOnHover() && !disabled() && allowMouseEnter(),
    handleClose: safePolygon({ blockPointerEvents: true }),
    mouseOnly: true,
    move: true,
    restMs: delay,
    delay: () => ({ open: delay(), close: closeDelay() }),
    triggerElementRef,
    externalTree: floatingTreeRoot,
  });

  const click = useClick(floatingRootContext, {
    enabled: () => !disabled(),
    event: 'mousedown',
    toggle: () => !openOnHover(),
    ignoreMouse: openOnHover,
    stickIfOpen: false,
  });

  const localInteractionProps = useInteractions([click]);

  const rootTriggerProps = createMemo(() => {
    const p = store.useState('triggerProps', true)();
    delete p.id;
    return p;
  });

  const state: MenuSubmenuTrigger.State = {
    get disabled() {
      return disabled();
    },
    get highlighted() {
      return highlighted();
    },
    get open() {
      return open();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping: triggerOpenStateMapping,
    get props() {
      return [
        localInteractionProps.getReferenceProps(),
        hoverProps,
        rootTriggerProps(),
        itemProps(),
        {
          get tabIndex() {
            return open() || highlighted() ? 0 : -1;
          },
          onBlur() {
            if (highlighted()) {
              parentMenuStore.set('activeIndex', null);
            }
          },
        },
        elementProps,
        getItemProps,
      ];
    },
    ref: (el) => {
      listItem.setRef(el);
      setItemRef(el);
      registerTrigger(el);
      handleTriggerElementRef(el);
    },
  });

  return <>{element()}</>;
}

export interface MenuSubmenuTriggerProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuSubmenuTrigger.State> {
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>;
  /**
   * Overrides the text label to use when the item is matched during keyboard text navigation.
   */
  label?: string;
  /**
   * @ignore
   */
  id?: string;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean;
  /**
   * How long to wait before the menu may be opened on hover. Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 100
   */
  delay?: number;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 0
   */
  closeDelay?: number;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean;
}

export interface MenuSubmenuTriggerState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
}

export namespace MenuSubmenuTrigger {
  export type Props = MenuSubmenuTriggerProps;
  export type State = MenuSubmenuTriggerState;
}

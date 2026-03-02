import { splitComponentProps } from '@msviderok/base-ui-solid/solid-helpers';
import { createMemo, Show } from 'solid-js';
import { CompositeRoot } from '../../composite/root/CompositeRoot';
import { useDismiss } from '../../floating-ui-solid';
import { contains, getTarget } from '../../floating-ui-solid/utils';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import { EMPTY_OBJECT } from '../../utils/constants';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { NAVIGATION_MENU_TRIGGER_IDENTIFIER } from '../utils/constants';
import { NavigationMenuDismissContext } from './NavigationMenuDismissContext';

/**
 * Contains a list of navigation menu items.
 * Renders a `<ul>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuList(componentProps: NavigationMenuList.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, ['children']);

  const { orientation, open, floatingRootContext, positionerElement, popupElement, value, nested } =
    useNavigationMenuRootContext();

  const fallbackContext = createMemo(() => getEmptyRootContext());
  const context = () => floatingRootContext() || fallbackContext();
  const interactionsEnabled = () => (positionerElement() ? true : !value());

  const dismiss = useDismiss({
    get context() {
      return context();
    },
    props: {
      get enabled() {
        return interactionsEnabled();
      },
      outsidePressEvent: 'intentional',
      outsidePress(event) {
        const target = getTarget(event) as HTMLElement | null;
        if (contains(positionerElement(), target) || contains(popupElement(), target)) {
          return false;
        }
        const closestNavigationMenuTrigger = target?.closest(
          `[${NAVIGATION_MENU_TRIGGER_IDENTIFIER}]`,
        );
        return closestNavigationMenuTrigger === null;
      },
    },
  });

  const dismissProps = {
    get props() {
      return floatingRootContext() ? dismiss : undefined;
    },
  };

  const state: NavigationMenuList.State = {
    get open() {
      return open();
    },
  };

  // `stopEventPropagation` won't stop the propagation if the end of the list is reached,
  // but we want to block it in this case.
  // When nested, skip this handler so arrow keys can reach the parent CompositeRoot.
  const defaultProps: HTMLProps = {
    get onKeyDown() {
      if (nested()) {
        return undefined;
      }

      return (event: KeyboardEvent) => {
        const shouldStop =
          (orientation() === 'horizontal' &&
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) ||
          (orientation() === 'vertical' && (event.key === 'ArrowUp' || event.key === 'ArrowDown'));

        if (shouldStop) {
          event.stopPropagation();
        }
      };
    },
  };

  const props = {
    get props() {
      return [dismissProps.props?.floating || EMPTY_OBJECT, defaultProps, elementProps];
    },
  };

  // When nested, skip the CompositeRoot wrapper so that triggers can participate
  // in the parent Content's composite navigation context. Also skip the onKeyDown
  // handler that blocks propagation so arrow keys can reach the parent CompositeRoot.
  const element = useRenderElement('ul', componentProps, {
    state,
    props: props.props,
    enabled: nested,
  });

  return (
    <Show
      when={!nested()}
      fallback={
        <NavigationMenuDismissContext.Provider value={dismissProps.props}>
          {element()}
        </NavigationMenuDismissContext.Provider>
      }
    >
      <NavigationMenuDismissContext.Provider value={dismissProps.props}>
        <CompositeRoot
          render={renderProps.render}
          class={renderProps.class}
          state={state}
          refs={[
            (el) => {
              if (typeof componentProps.ref === 'function') {
                componentProps.ref(el as HTMLUListElement);
              } else {
                componentProps.ref = el as any;
              }
            },
          ]}
          props={props.props}
          loopFocus={false}
          orientation={orientation()}
          tag="ul"
        >
          {local.children}
        </CompositeRoot>
      </NavigationMenuDismissContext.Provider>
    </Show>
  );
}

export interface NavigationMenuListState {
  /**
   * If `true`, the popup is open.
   */
  open: boolean;
}

export interface NavigationMenuListProps extends BaseUIComponentProps<
  'ul',
  NavigationMenuList.State
> {}

export namespace NavigationMenuList {
  export type State = NavigationMenuListState;
  export type Props = NavigationMenuListProps;
}

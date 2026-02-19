import { createEffect, onCleanup } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { DrawerBackdropCssVars } from '../backdrop/DrawerBackdropCssVars';
import { DrawerPopupCssVars } from '../popup/DrawerPopupCssVars';
import { useDrawerProviderContext } from '../provider/DrawerProviderContext';

const stateAttributesMapping: StateAttributesMapping<DrawerIndent.State> = {
  active(value): Record<string, string> | null {
    if (value) {
      return { 'data-active': '' };
    }
    return { 'data-inactive': '' };
  },
};

/**
 * A wrapper element intended to contain your app's main UI.
 * Applies `data-active` when any drawer within the nearest <Drawer.Provider> is open.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export function DrawerIndent(componentProps: DrawerIndent.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const providerContext = useDrawerProviderContext(true);

  const active = () => providerContext?.active() ?? false;
  const visualStateStore = providerContext?.visualStateStore;

  let indentRef = null as HTMLDivElement | null | undefined;

  createEffect(() => {
    const element = indentRef;
    if (!element || !visualStateStore) {
      return;
    }

    const syncVisualState = () => {
      if (visualStateStore.swipeProgress <= 0) {
        element.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
      } else {
        element.style.setProperty(
          DrawerBackdropCssVars.swipeProgress,
          `${visualStateStore.swipeProgress}`,
        );
      }

      if (visualStateStore.frontmostHeight <= 0) {
        element.style.removeProperty(DrawerPopupCssVars.height);
      } else {
        element.style.setProperty(
          DrawerPopupCssVars.height,
          `${visualStateStore.frontmostHeight}px`,
        );
      }
    };

    syncVisualState();

    onCleanup(() => {
      element.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
      element.style.removeProperty(DrawerPopupCssVars.height);
    });
  });

  const state: DrawerIndent.State = {
    get active() {
      return active();
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      indentRef = el;
    },
    state,
    props: [
      {
        style: {
          [DrawerBackdropCssVars.swipeProgress]: '0',
        },
      },
      elementProps,
    ],
    stateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface DrawerIndentState {
  /**
   * Whether any drawer within the nearest <Drawer.Provider> is open.
   */
  active: boolean;
}

export interface DrawerIndentProps extends BaseUIComponentProps<'div', DrawerIndent.State> {}

export namespace DrawerIndent {
  export type State = DrawerIndentState;
  export type Props = DrawerIndentProps;
}

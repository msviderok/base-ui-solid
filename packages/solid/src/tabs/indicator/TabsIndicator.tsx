import {
  createMemo,
  createRenderEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from 'solid-js';
import { useCSPContext } from '../../csp-provider/CSPContext';
import { splitComponentProps } from '../../solid-helpers';
import { getCssDimensions } from '../../utils/getCssDimensions';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTabsListContext } from '../list/TabsListContext';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import type { TabsRoot } from '../root/TabsRoot';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsTab } from '../tab/TabsTab';
import { script as prehydrationScript } from './prehydrationScript.min';
import { TabsIndicatorCssVars } from './TabsIndicatorCssVars';

const stateAttributesMapping = {
  ...tabsStateAttributesMapping,
  activeTabPosition: () => null,
  activeTabSize: () => null,
};

/**
 * A visual indicator that can be styled to match the position of the currently active tab.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsIndicator(componentProps: TabsIndicator.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['renderBeforeHydration']);
  const renderBeforeHydration = () => local.renderBeforeHydration ?? false;

  const { nonce } = useCSPContext();

  const { getTabElementBySelectedValue, orientation, tabActivationDirection, value } =
    useTabsRootContext();

  const { tabsListElement } = useTabsListContext();

  const [isMounted, setIsMounted] = createSignal(false);
  const [positioningTick, forcePositioningUpdate] = createSignal(undefined, { equals: false });
  const activeTabValue = value;

  onMount(() => {
    setIsMounted(true);
    forcePositioningUpdate();

    if (typeof ResizeObserver !== 'undefined' && tabsListElement.current != null) {
      const resizeObserver = new ResizeObserver(forcePositioningUpdate);

      resizeObserver.observe(tabsListElement.current);

      onCleanup(() => {
        resizeObserver.disconnect();
      });
    }
  });

  const meta = createMemo(() => {
    positioningTick();

    const selectedValue = value();
    const tabsList = tabsListElement.current;

    if (selectedValue == null || tabsList == null) {
      return {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        isTabSelected: false,
      };
    }

    const activeTab = getTabElementBySelectedValue(selectedValue);

    let left = 0;
    let right = 0;
    let top = 0;
    let bottom = 0;
    let width = 0;
    let height = 0;

    if (activeTab != null) {
      const { width: computedWidth, height: computedHeight } = getCssDimensions(activeTab);
      const { width: tabListWidth, height: tabListHeight } = getCssDimensions(tabsList);
      const tabRect = activeTab.getBoundingClientRect();
      const tabsListRect = tabsList.getBoundingClientRect();
      const scaleX = tabListWidth > 0 ? tabsListRect.width / tabListWidth : 1;
      const scaleY = tabListHeight > 0 ? tabsListRect.height / tabListHeight : 1;
      const hasNonZeroScale =
        Math.abs(scaleX) > Number.EPSILON && Math.abs(scaleY) > Number.EPSILON;

      if (hasNonZeroScale) {
        const tabLeftDelta = tabRect.left - tabsListRect.left;
        const tabTopDelta = tabRect.top - tabsListRect.top;

        left = tabLeftDelta / scaleX + tabsList.scrollLeft - tabsList.clientLeft;
        top = tabTopDelta / scaleY + tabsList.scrollTop - tabsList.clientTop;
      } else {
        left = activeTab.offsetLeft;
        top = activeTab.offsetTop;
      }

      width = computedWidth;
      height = computedHeight;
      right = tabsList.scrollWidth - left - width;
      bottom = tabsList.scrollHeight - top - height;
    }

    return {
      left,
      right,
      top,
      bottom,
      width,
      height,
      isTabSelected: true,
    };
  });

  createRenderEffect(() => {
    value();
    forcePositioningUpdate();
  });

  const activeTabPosition = createMemo(() =>
    meta().isTabSelected
      ? { left: meta().left, right: meta().right, top: meta().top, bottom: meta().bottom }
      : null,
  );

  const activeTabSize = createMemo(() =>
    meta().isTabSelected ? { width: meta().width, height: meta().height } : null,
  );

  const style = createMemo(() => {
    if (!meta().isTabSelected) {
      return undefined;
    }

    return {
      [TabsIndicatorCssVars.activeTabLeft]: `${meta().left}px`,
      [TabsIndicatorCssVars.activeTabRight]: `${meta().right}px`,
      [TabsIndicatorCssVars.activeTabTop]: `${meta().top}px`,
      [TabsIndicatorCssVars.activeTabBottom]: `${meta().bottom}px`,
      [TabsIndicatorCssVars.activeTabWidth]: `${meta().width}px`,
      [TabsIndicatorCssVars.activeTabHeight]: `${meta().height}px`,
    } as JSX.CSSProperties;
  });

  const displayIndicator = createMemo(
    () => meta().isTabSelected && meta().width > 0 && meta().height > 0,
  );

  const state: TabsIndicator.State = {
    get orientation() {
      return orientation();
    },
    get activeTabPosition() {
      return activeTabPosition();
    },
    get activeTabSize() {
      return activeTabSize();
    },
    get tabActivationDirection() {
      return tabActivationDirection();
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    props: [
      {
        role: 'presentation',
        get style() {
          return style();
        },
        get hidden() {
          return !displayIndicator(); // do not display the indicator before the layout is settled
        },
      },
      elementProps,
      {
        // @ts-expect-error - suppressHydrationWarning is not a valid attribute for Solid
        suppressHydrationWarning: true,
      },
    ],
    stateAttributesMapping,
  });

  return (
    <Show when={activeTabValue() != null}>
      {element()}
      {!isMounted() && renderBeforeHydration() && (
        <script
          nonce={nonce()}
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={prehydrationScript}
          // @ts-expect-error - suppressHydrationWarnings is not a valid attribute for Solid
          suppressHydrationWarnings
        />
      )}
    </Show>
  );
}

export interface TabsIndicatorState extends TabsRoot.State {
  activeTabPosition: TabsTab.Position | null;
  activeTabSize: TabsTab.Size | null;
  orientation: TabsRoot.Orientation;
}

export interface TabsIndicatorProps extends BaseUIComponentProps<'span', TabsIndicator.State> {
  /**
   * Whether to render itself before React hydrates.
   * This minimizes the time that the indicator isn’t visible after server-side rendering.
   * @default false
   */
  renderBeforeHydration?: boolean | undefined;
}

export namespace TabsIndicator {
  export type State = TabsIndicatorState;
  export type Props = TabsIndicatorProps;
}

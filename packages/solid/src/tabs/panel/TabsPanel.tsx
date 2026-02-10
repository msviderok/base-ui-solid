import { createEffect, onCleanup, Show, type Accessor } from 'solid-js';
import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import type { TabsRoot } from '../root/TabsRoot';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsTab } from '../tab/TabsTab';
import { TabsPanelDataAttributes } from './TabsPanelDataAttributes';

/**
 * A panel displayed when the corresponding tab is active.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsPanel(componentProps: TabsPanel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['value', 'keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const {
    value: selectedValue,
    getTabIdByPanelValue,
    orientation,
    tabActivationDirection,
    registerMountedTabPanel,
    unregisterMountedTabPanel,
  } = useTabsRootContext();

  const id = useBaseUiId();

  const metadata = {
    id,
    value: () => local.value,
  };

  const { setRef: setListItemRef, index } = useCompositeListItem({ metadata });

  const hidden = () => local.value !== selectedValue();

  const correspondingTabId = () => getTabIdByPanelValue(local.value);

  const state: TabsPanel.State = {
    get hidden() {
      return hidden();
    },
    get orientation() {
      return orientation();
    },
    get tabActivationDirection() {
      return tabActivationDirection();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: setListItemRef,
    props: [
      {
        role: 'tabpanel',
        get 'aria-labelledby'() {
          return correspondingTabId();
        },
        get hidden() {
          return hidden();
        },
        get id() {
          return id();
        },
        get tabIndex() {
          return hidden() ? -1 : 0;
        },
        get [TabsPanelDataAttributes.index as string]() {
          return index();
        },
      },
      elementProps,
    ],
    stateAttributesMapping: tabsStateAttributesMapping,
  });

  createEffect(() => {
    if (hidden() && !keepMounted()) {
      return;
    }

    const resolvedId = id();
    if (resolvedId == null) {
      return;
    }

    registerMountedTabPanel(local.value, resolvedId);
    onCleanup(() => {
      unregisterMountedTabPanel(local.value, resolvedId);
    });
  });

  const shouldRender = () => !hidden() || keepMounted();

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface TabsPanelMetadata {
  id?: Accessor<string | undefined>;
  value: Accessor<TabsTab.Value>;
}

export interface TabsPanelState extends TabsRoot.State {
  hidden: boolean;
}

export interface TabsPanelProps extends BaseUIComponentProps<'div', TabsPanel.State> {
  /**
   * The value of the TabPanel. It will be shown when the Tab with the corresponding value is active.
   */
  value: TabsTab.Value;
  /**
   * Whether to keep the HTML element in the DOM while the panel is hidden.
   * @default false
   */
  keepMounted?: boolean;
}

export namespace TabsPanel {
  export type Metadata = TabsPanelMetadata;
  export type State = TabsPanelState;
  export type Props = TabsPanelProps;
}

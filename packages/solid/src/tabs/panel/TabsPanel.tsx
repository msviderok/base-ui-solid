import { createEffect, onCleanup, Show, type Accessor } from 'solid-js';
import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import { splitComponentProps } from '../../solid-helpers';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTransitionStatus, type TransitionStatus } from '../../utils/useTransitionStatus';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import type { TabsRoot } from '../root/TabsRoot';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsTab } from '../tab/TabsTab';
import { TabsPanelDataAttributes } from './TabsPanelDataAttributes';

const stateAttributesMapping: StateAttributesMapping<TabsPanel.State> = {
  ...tabsStateAttributesMapping,
  ...transitionStatusMapping,
};

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

  const open = () => local.value === selectedValue();
  const { mounted, transitionStatus, setMounted } = useTransitionStatus(open);
  const hidden = () => !mounted();

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
    get transitionStatus() {
      return transitionStatus();
    },
  };

  let panelRef = null as HTMLDivElement | null | undefined;

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      panelRef = el;
      setListItemRef(el);
    },
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
          return open() ? 0 : -1;
        },
        get inert() {
          return !open();
        },
        get [TabsPanelDataAttributes.index as string]() {
          return index();
        },
      },
      elementProps,
    ],
    stateAttributesMapping,
  });

  useOpenChangeComplete({
    open,
    ref: () => panelRef,
    onComplete() {
      if (!open()) {
        setMounted(false);
      }
    },
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

  const shouldRender = () => keepMounted() || mounted();

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface TabsPanelMetadata {
  id?: Accessor<string | undefined>;
  value: Accessor<TabsTab.Value>;
}

export interface TabsPanelState extends TabsRoot.State {
  hidden: boolean;
  transitionStatus: TransitionStatus;
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
  keepMounted?: boolean | undefined;
}

export namespace TabsPanel {
  export type Metadata = TabsPanelMetadata;
  export type State = TabsPanelState;
  export type Props = TabsPanelProps;
}

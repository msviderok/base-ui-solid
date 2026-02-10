import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import type { CompositeMetadata } from '../../composite/list/CompositeList';
import type { TextDirection } from '../../direction-provider/DirectionContext';
import type { TabsTab } from '../tab/TabsTab';
import type { TabsRoot } from './TabsRoot';

export interface TabsRootContext {
  direction: Accessor<TextDirection>;
  /**
   * The currently active tab's value.
   */
  value: Accessor<TabsTab.Value>;
  /**
   * Callback for setting new value.
   */
  onValueChange: (value: TabsTab.Value, eventDetails: TabsRoot.ChangeEventDetails) => void;
  /**
   * The component orientation (layout flow direction).
   */
  orientation: Accessor<'horizontal' | 'vertical'>;
  /**
   * Gets the element of the Tab with the given value.
   */
  getTabElementBySelectedValue: (
    selectedValue: TabsTab.Value | undefined,
  ) => HTMLElement | null | undefined;
  /**
   * Gets the `id` attribute of the Tab that corresponds to the given TabPanel value.
   * @param (any) panelValue Value to find the Tab for.
   */
  getTabIdByPanelValue: (panelValue: TabsTab.Value) => string | undefined;
  /**
   * Gets the `id` attribute of the TabPanel that corresponds to the given Tab value.
   * @param (any) tabValue Value to find the TabPanel for.
   */
  getTabPanelIdByValue: (tabValue: TabsTab.Value) => string | undefined;
  registerMountedTabPanel: (panelValue: TabsTab.Value | number, panelId: string) => void;
  setTabArray: Setter<
    Array<{ element: Element; metadata: CompositeMetadata<TabsTab.Metadata> | null }>
  >;
  unregisterMountedTabPanel: (panelValue: TabsTab.Value | number, panelId: string) => void;
  /**
   * The position of the active tab relative to the previously active tab.
   */
  tabActivationDirection: Accessor<TabsTab.ActivationDirection>;
}

/**
 * @internal
 */
export const TabsRootContext = createContext<TabsRootContext | undefined>(undefined);

export function useTabsRootContext() {
  const context = useContext(TabsRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: TabsRootContext is missing. Tabs parts must be placed within <Tabs.Root>.',
    );
  }

  return context;
}

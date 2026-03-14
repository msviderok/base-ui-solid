import { batch, createEffect, createMemo, createSignal } from 'solid-js';
import type { CompositeMetadata } from '../../composite/list/CompositeList';
import { CompositeList } from '../../composite/list/CompositeList';
import { useDirection } from '../../direction-provider/DirectionContext';
import { splitComponentProps } from '../../solid-helpers';
import { type BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { Orientation as BaseOrientation, BaseUIComponentProps } from '../../utils/types';
import { useControlled } from '../../utils/useControlled';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TabsPanel } from '../panel/TabsPanel';
import type { TabsTab } from '../tab/TabsTab';
import { TabsRootContext } from './TabsRootContext';
import { tabsStateAttributesMapping } from './stateAttributesMapping';

/**
 * Groups the tabs and the corresponding panels.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsRoot(componentProps: TabsRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'defaultValue',
    'onValueChange',
    'orientation',
    'value',
  ]);
  const defaultValueProp = () => local.defaultValue ?? 0;
  const orientation = () => local.orientation ?? 'horizontal';
  const valueProp = () => local.value;

  const direction = useDirection();

  // Track whether the user explicitly provided a `defaultValue` prop.
  // Used to determine if we should honor a disabled tab selection.
  const hasExplicitDefaultValueProp = () => Object.hasOwn(componentProps, 'defaultValue');

  const tabPanelRefs: (HTMLElement | null | undefined)[] = [];
  const [mountedTabPanels, setMountedTabPanels] = createSignal<
    Record<TabsTab.Value | number, string>
  >({});

  const [value, setValue] = useControlled({
    controlled: valueProp,
    default: defaultValueProp,
    name: 'Tabs',
    state: 'value',
  });

  const isControlled = () => valueProp() !== undefined;
  const [tabArray, setTabArray] = createSignal<
    Array<{ element: Element; metadata: CompositeMetadata<TabsTab.Metadata> | null }>
  >([]);

  const [tabActivationDirection, setTabActivationDirection] =
    createSignal<TabsTab.ActivationDirection>('none');

  const onValueChange = (newValue: TabsTab.Value, eventDetails: TabsRoot.ChangeEventDetails) => {
    batch(() => {
      local.onValueChange?.(newValue, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      setValue(newValue);
      setTabActivationDirection(eventDetails.activationDirection);
    });
  };

  const registerMountedTabPanel = (panelValue: TabsTab.Value | number, panelId: string) => {
    setMountedTabPanels((prev) => {
      if (prev[panelValue] === panelId) {
        return prev;
      }

      return { ...prev, [panelValue]: panelId };
    });
  };

  const unregisterMountedTabPanel = (panelValue: TabsTab.Value | number, panelId: string) => {
    setMountedTabPanels((prev) => {
      if (!prev[panelValue] || prev[panelValue] !== panelId) {
        return prev;
      }

      const next = { ...prev };
      delete next[panelValue];
      return next;
    });
  };

  // get the `id` attribute of <Tabs.Panel> to set as the value of `aria-controls` on <Tabs.Tab>
  const getTabPanelIdByValue = (tabValue: TabsTab.Value) => {
    return mountedTabPanels()[tabValue];
  };

  // get the `id` attribute of <Tabs.Tab> to set as the value of `aria-labelledby` on <Tabs.Panel>
  const getTabIdByPanelValue = (tabPanelValue: TabsTab.Value) => {
    for (const { metadata: tabMetadata } of tabArray()) {
      if (tabPanelValue === tabMetadata?.value()) {
        return tabMetadata?.id();
      }
    }
    return undefined;
  };

  // used in `useActivationDirectionDetector` for setting data-activation-direction
  const getTabElementBySelectedValue = (
    selectedValue: TabsTab.Value | undefined,
  ): HTMLElement | null => {
    if (selectedValue === undefined) {
      return null;
    }

    for (const { element, metadata } of tabArray()) {
      if (metadata != null && selectedValue === (metadata?.value() ?? metadata?.index)) {
        return element as HTMLElement;
      }
    }

    return null;
  };

  const tabsContextValue: TabsRootContext = {
    direction,
    getTabElementBySelectedValue,
    getTabIdByPanelValue,
    getTabPanelIdByValue,
    onValueChange,
    orientation,
    registerMountedTabPanel,
    setTabArray,
    unregisterMountedTabPanel,
    tabActivationDirection,
    value,
  };

  const selectedTabMetadata = createMemo(() => {
    for (const { metadata: tabMetadata } of tabArray()) {
      if (tabMetadata != null && tabMetadata.value() === value()) {
        return tabMetadata;
      }
    }
    return undefined;
  });

  // Find the first non-disabled tab value.
  // Used as a fallback when the current selection is disabled or missing.
  const firstEnabledTabValue = createMemo(() => {
    for (const { metadata: tabMetadata } of tabArray()) {
      if (tabMetadata != null && !tabMetadata.disabled()) {
        return tabMetadata.value();
      }
    }
    return undefined;
  });

  // Automatically switch to the first enabled tab when:
  // - The current selection is disabled (and wasn't explicitly set via defaultValue)
  // - The current selection is missing (tab was removed from DOM)
  // Falls back to null if all tabs are disabled.
  createEffect(() => {
    if (isControlled() || tabArray().length === 0) {
      return;
    }

    const selectionIsDisabled = selectedTabMetadata()?.disabled();
    const selectionIsMissing = selectedTabMetadata() == null && value() !== null;

    const shouldHonorExplicitDefaultSelection =
      hasExplicitDefaultValueProp() && selectionIsDisabled && value() === defaultValueProp();

    if (shouldHonorExplicitDefaultSelection) {
      return;
    }

    if (!selectionIsDisabled && !selectionIsMissing) {
      return;
    }

    const fallbackValue = firstEnabledTabValue() ?? null;

    if (value() === fallbackValue) {
      return;
    }

    setValue(fallbackValue);
    setTabActivationDirection('none');
  });

  const state: TabsRoot.State = {
    get orientation() {
      return orientation();
    },
    get tabActivationDirection() {
      return tabActivationDirection();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping: tabsStateAttributesMapping,
  });

  return (
    <TabsRootContext.Provider value={tabsContextValue}>
      <CompositeList<TabsPanel.Metadata> refs={{ elements: tabPanelRefs }}>
        {element()}
      </CompositeList>
    </TabsRootContext.Provider>
  );
}

export type TabsRootOrientation = BaseOrientation;

export interface TabsRootState {
  orientation: TabsRoot.Orientation;
  tabActivationDirection: TabsTab.ActivationDirection;
}

export interface TabsRootProps extends BaseUIComponentProps<'div', TabsRoot.State> {
  /**
   * The value of the currently active `Tab`. Use when the component is controlled.
   * When the value is `null`, no Tab will be active.
   */
  value?: TabsTab.Value | undefined;
  /**
   * The default value. Use when the component is not controlled.
   * When the value is `null`, no Tab will be active.
   * @default 0
   */
  defaultValue?: TabsTab.Value | undefined;
  /**
   * The component orientation (layout flow direction).
   * @default 'horizontal'
   */
  orientation?: TabsRoot.Orientation | undefined;
  /**
   * Callback invoked when new value is being set.
   */
  onValueChange?:
    | ((value: TabsTab.Value, eventDetails: TabsRoot.ChangeEventDetails) => void)
    | undefined;
}

export type TabsRootChangeEventReason = typeof REASONS.none;
export type TabsRootChangeEventDetails = BaseUIChangeEventDetails<
  TabsRoot.ChangeEventReason,
  { activationDirection: TabsTab.ActivationDirection }
>;

export namespace TabsRoot {
  export type State = TabsRootState;
  export type Props = TabsRootProps;
  export type Orientation = TabsRootOrientation;
  export type ChangeEventReason = TabsRootChangeEventReason;
  export type ChangeEventDetails = TabsRootChangeEventDetails;
}

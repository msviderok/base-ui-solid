import { createEffect, createSignal, type Accessor } from 'solid-js';
import { CompositeRoot } from '../../composite/root/CompositeRoot';
import { splitComponentProps } from '../../solid-helpers';
import { EMPTY_ARRAY } from '../../utils/constants';
import { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import type { TabsRoot } from '../root/TabsRoot';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsTab } from '../tab/TabsTab';
import { TabsListContext } from './TabsListContext';

/**
 * Groups the individual tab buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsList(componentProps: TabsList.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(componentProps, [
    'activateOnFocus',
    'loopFocus',
  ]);
  const activateOnFocus = () => local.activateOnFocus ?? false;
  const loopFocus = () => local.loopFocus ?? true;

  const {
    getTabElementBySelectedValue,
    onValueChange,
    orientation,
    value,
    setTabArray,
    tabActivationDirection,
  } = useTabsRootContext();

  const [highlightedTabIndex, setHighlightedTabIndex] = createSignal(0);

  const refs: TabsListContext['refs'] = {
    tabsListElement: null,
  };

  const detectActivationDirection = useActivationDirectionDetector(
    value, // the old value
    orientation,
    () => refs.tabsListElement,
    getTabElementBySelectedValue,
  );

  const onTabActivation = (newValue: any, eventDetails: TabsRoot.ChangeEventDetails) => {
    if (newValue !== value()) {
      const activationDirection = detectActivationDirection(newValue);
      eventDetails.activationDirection = activationDirection;
      onValueChange(newValue, eventDetails);
    }
  };

  const state: TabsList.State = {
    get orientation() {
      return orientation();
    },
    get tabActivationDirection() {
      return tabActivationDirection();
    },
  };

  const defaultProps: HTMLProps = {
    get 'aria-orientation'() {
      return orientation() === 'vertical' ? 'vertical' : undefined;
    },
    role: 'tablist',
  };

  const tabsListContextValue: TabsListContext = {
    activateOnFocus,
    highlightedTabIndex,
    onTabActivation,
    setHighlightedTabIndex,
    refs,
    value,
  };

  return (
    <TabsListContext.Provider value={tabsListContextValue}>
      <CompositeRoot
        render={renderProps.render}
        class={renderProps.class}
        state={state}
        refs={[
          componentProps.ref as any,
          (el: HTMLElement | null | undefined) => {
            refs.tabsListElement = el;
          },
        ]}
        props={[defaultProps, elementProps]}
        stateAttributesMapping={tabsStateAttributesMapping}
        highlightedIndex={highlightedTabIndex()}
        enableHomeAndEndKeys
        loopFocus={loopFocus()}
        orientation={orientation()}
        onHighlightedIndexChange={setHighlightedTabIndex}
        onMapChange={setTabArray}
        disabledIndices={EMPTY_ARRAY as number[]}
      />
    </TabsListContext.Provider>
  );
}

function getInset(tab: HTMLElement, tabsList: HTMLElement) {
  const { left: tabLeft, top: tabTop } = tab.getBoundingClientRect();
  const { left: listLeft, top: listTop } = tabsList.getBoundingClientRect();

  const left = tabLeft - listLeft;
  const top = tabTop - listTop;

  return { left, top };
}

function useActivationDirectionDetector(
  // the old value
  activeTabValue: Accessor<any>,
  orientation: Accessor<TabsRoot.Orientation>,
  tabsListElement: Accessor<HTMLElement | null | undefined>,
  getTabElement: (selectedValue: any) => HTMLElement | null | undefined,
): (newValue: any) => TabsTab.ActivationDirection {
  const [previousTabEdge, setPreviousTabEdge] = createSignal<number | null>(null);

  createEffect(() => {
    const tabsList = tabsListElement();
    // Whenever orientation changes, reset the state.
    if (activeTabValue() == null || tabsList == null) {
      setPreviousTabEdge(null);
      return;
    }

    const activeTab = getTabElement(activeTabValue());
    if (activeTab == null) {
      setPreviousTabEdge(null);
      return;
    }

    const { left, top } = getInset(activeTab, tabsList);
    setPreviousTabEdge(orientation() === 'horizontal' ? left : top);
  });

  return (newValue: any) => {
    if (newValue === activeTabValue()) {
      return 'none';
    }

    if (newValue == null) {
      setPreviousTabEdge(null);
      return 'none';
    }

    const tabsList = tabsListElement();
    if (newValue != null && tabsList != null) {
      const activeTabElement = getTabElement(newValue);

      if (activeTabElement != null) {
        const { left, top } = getInset(activeTabElement, tabsList);

        const tabEdge = previousTabEdge();
        if (tabEdge == null) {
          setPreviousTabEdge(orientation() === 'horizontal' ? left : top);
          return 'none';
        }

        if (orientation() === 'horizontal') {
          if (left < tabEdge) {
            setPreviousTabEdge(left);
            return 'left';
          }
          if (left > tabEdge) {
            setPreviousTabEdge(left);
            return 'right';
          }
        } else if (top < tabEdge) {
          setPreviousTabEdge(top);
          return 'up';
        } else if (top > tabEdge) {
          setPreviousTabEdge(top);
          return 'down';
        }
      }
    }

    return 'none';
  };
}

export interface TabsListState extends TabsRoot.State {}

export interface TabsListProps extends BaseUIComponentProps<'div', TabsList.State> {
  /**
   * Whether to automatically change the active tab on arrow key focus.
   * Otherwise, tabs will be activated using <kbd>Enter</kbd> or <kbd>Space</kbd> key press.
   * @default false
   */
  activateOnFocus?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export namespace TabsList {
  export type State = TabsListState;
  export type Props = TabsListProps;
}

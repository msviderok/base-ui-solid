import { Show, type Accessor, type JSX } from 'solid-js';
import { CompositeList } from '../../composite/list/CompositeList';
import { stopEvent } from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { ComboboxCollection } from '../collection/ComboboxCollection';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import {
  useComboboxDerivedItemsContext,
  useComboboxFloatingContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';

/**
 * A list container for the items.
 * Renders a `<div>` element.
 */
export function ComboboxList(componentProps: ComboboxList.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children']);

  const store = useComboboxRootContext();
  const floatingRootContext = useComboboxFloatingContext();
  const hasPositionerContext = Boolean(useComboboxPositionerContext(true));
  const { filteredItems } = useComboboxDerivedItemsContext();

  const items = store.useState('items');
  const labelsRef = store.useState('labelsRef');
  const listRef = store.select('listRef');
  const selectionMode = store.useState('selectionMode');
  const grid = store.useState('grid');
  const popupProps = store.useState('popupProps');
  const disabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const virtualized = store.useState('virtualized');

  const multiple = () => selectionMode() === 'multiple';
  const empty = () => filteredItems().length === 0;

  const setPositionerElement = (element: HTMLElement | null | undefined) => {
    store.set('positionerElement', element);
  };

  const setListElement = (element: HTMLElement | null | undefined) => {
    store.set('listElement', element);
  };

  const state: ComboboxList.State = {
    get empty() {
      return empty();
    },
  };

  const floatingId = floatingRootContext.useState('floatingId');

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      setListElement(el);
      if (!hasPositionerContext) {
        setPositionerElement(el);
      }
    },
    get props() {
      return [
        popupProps(),
        {
          // Support "closed template" API: if children is a function, implicitly wrap it
          // with a Combobox.Collection that reads items from context/root.
          // Ensures this component's `popupProps` subscription does not cause <Combobox.Item>
          // to re-render on every active index change.

          get children() {
            return (
              <Show
                when={typeof local.children === 'function' && local.children}
                fallback={local.children as JSX.Element}
              >
                {(children) => <ComboboxCollection>{children()}</ComboboxCollection>}
              </Show>
            );
          },
          tabIndex: -1,
          id: floatingId(),
          role: grid() ? 'grid' : 'listbox',
          'aria-multiselectable': multiple() ? 'true' : undefined,
          onKeyDown(event: KeyboardEvent) {
            if (disabled() || readOnly()) {
              return;
            }

            if (event.key === 'Enter') {
              const activeIndex = store.state.activeIndex;

              if (activeIndex == null) {
                // Allow form submission when no item is highlighted.
                return;
              }

              stopEvent(event);

              const nativeEvent = event;
              const listItem = store.state.listRef[activeIndex];

              if (listItem) {
                store.setState('selectionEventRef', nativeEvent);
                listItem.click();
                store.setState('selectionEventRef', null);
              }
            }
          },
          onKeyDownCapture() {
            store.setState('keyboardActiveRef', true);
          },
          onPointerMoveCapture() {
            store.setState('keyboardActiveRef', false);
          },
        },
        elementProps,
      ];
    },
  });

  return (
    <Show when={!virtualized()} fallback={element()}>
      <CompositeList refs={{ elements: listRef, labels: items() ? undefined : labelsRef() }}>
        {element()}
      </CompositeList>
    </Show>
  );
}

export interface ComboboxListState {
  /**
   * Whether the list is empty.
   */
  empty: boolean;
}

export interface ComboboxListProps extends Omit<
  BaseUIComponentProps<'div', ComboboxList.State>,
  'children'
> {
  children?: JSX.Element | ((item: any, index: Accessor<number>) => JSX.Element);
}

export namespace ComboboxList {
  export type State = ComboboxListState;
  export type Props = ComboboxListProps;
}

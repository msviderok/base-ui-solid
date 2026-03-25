import { createEffect, Show, type Accessor, type JSX } from 'solid-js';
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
  const [, local, elementProps] = splitComponentProps(componentProps, ['children', 'id']);

  const { store } = useComboboxRootContext();
  const { context: floatingRootContext } = useComboboxFloatingContext();
  const hasPositionerContext = Boolean(useComboboxPositionerContext(true));
  const { filteredItems } = useComboboxDerivedItemsContext();
  const floatingId = floatingRootContext.useState('floatingId');

  const items = store.useSelector('items');
  const selectionMode = store.useSelector('selectionMode');
  const grid = store.useSelector('grid');
  const disabled = store.useSelector('disabled');
  const readOnly = store.useSelector('readOnly');
  const virtualized = store.useSelector('virtualized');

  const multiple = () => selectionMode() === 'multiple';
  const empty = () => filteredItems().length === 0;
  // React can derive `aria-controls` from the list ref on rerender. In Solid,
  // the listbox id needs to be an explicit reactive value because assigning the
  // DOM `id` later does not make `element.id` reactive.
  const listboxId = () => local.id ?? floatingId();

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

  createEffect(() => {
    store.set('listboxId', listboxId());
  });

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      setListElement(el);
      if (!hasPositionerContext) {
        setPositionerElement(el);
      }
    },
    // Support "closed template" API: if children is a function, implicitly wrap it
    // with a Combobox.Collection that reads items from context/root.
    // Ensures this component's `popupProps` subscription does not cause <Combobox.Item>
    // to re-render on every active index change.
    get children() {
      return (
        <Show
          keyed
          /**
           * Only render inside collection if children is rendered via explicit function call
           * and not an accessor.
           */
          when={typeof local.children === 'function' && local.children.length > 0 && local.children}
          fallback={local.children as JSX.Element}
        >
          {(children) => <ComboboxCollection>{children}</ComboboxCollection>}
        </Show>
      );
    },
    get props() {
      return [
        store.selectors.popupProps,
        {
          tabIndex: -1,
          id: listboxId(),
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
              const listItem = store.context.listRef[activeIndex];

              if (listItem) {
                store.set('selectionEventRef', nativeEvent);
                listItem.click();
                store.set('selectionEventRef', null);
              }
            }
          },
          onKeyDownCapture() {
            store.set('keyboardActiveRef', true);
          },
          onPointerMoveCapture() {
            store.set('keyboardActiveRef', false);
          },
        },
        elementProps,
      ];
    },
  });

  return (
    <Show when={!virtualized()} fallback={element()}>
      <CompositeList
        refs={{
          elements: store.context.listRef,
          labels: items() ? undefined : store.context.labelsRef,
        }}
      >
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

import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  mergeProps as solidMergeProps,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { CollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import { useCollapsibleRoot } from '../../collapsible/root/useCollapsibleRoot';
import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import { type CodependentRefs, splitComponentProps } from '../../solid-helpers';
import { type BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import type { AccordionRoot } from '../root/AccordionRoot';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import { AccordionItemContext } from './AccordionItemContext';
import { accordionStateAttributesMapping } from './stateAttributesMapping';

/**
 * Groups an accordion header with the corresponding panel.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/solid/components/accordion)
 */
export function AccordionItem(componentProps: AccordionItem.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'onOpenChange',
    'value',
  ]);

  const { setRef: setListItemRef, index } = useCompositeListItem();

  const {
    disabled: contextDisabled,
    handleValueChange,
    state: rootState,
    value: openValues,
  } = useAccordionRootContext();

  const fallbackValue = useBaseUiId();
  const value = () => local.value ?? fallbackValue();

  const disabled = () => (local.disabled ?? false) || contextDisabled();

  const isOpen = createMemo(() => {
    const values = openValues();
    if (!values) {
      return false;
    }

    for (let i = 0; i < values.length; i += 1) {
      if (values[i] === value()) {
        return true;
      }
    }

    return false;
  });

  const onOpenChange = (nextOpen: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => {
    batch(() => {
      local.onOpenChange?.(nextOpen, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      handleValueChange(value(), nextOpen);
    });
  };

  const collapsible = useCollapsibleRoot({
    open: isOpen,
    onOpenChange,
    disabled,
  });

  const collapsibleState = {
    get open() {
      return collapsible.open();
    },
    get disabled() {
      return collapsible.disabled();
    },
    get hidden() {
      return !collapsible.mounted();
    },
    get transitionStatus() {
      return collapsible.transitionStatus();
    },
  };

  const collapsibleContext: CollapsibleRootContext = solidMergeProps(collapsible, {
    onOpenChange,
    state: collapsibleState,
  });

  const state: AccordionItem.State = solidMergeProps(rootState, {
    get index() {
      return index();
    },
    get disabled() {
      return disabled();
    },
    get open() {
      return isOpen();
    },
  });

  const initialTriggerId = useBaseUiId();
  const [triggerId, setTriggerId] = createSignal<string | undefined>(initialTriggerId());
  const [codependentRefs, setCodependentRefs] = createStore<CodependentRefs<['trigger']>>({});

  createEffect(
    on(
      () => codependentRefs.trigger,
      (trigger) => {
        if (trigger) {
          setTriggerId(trigger.id() ?? trigger.explicitId());
        }
      },
    ),
  );

  const accordionItemContext: AccordionItemContext = {
    open: isOpen,
    state,
    triggerId,
    codependentRefs,
    setCodependentRefs,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: setListItemRef,
    props: elementProps,
    stateAttributesMapping: accordionStateAttributesMapping,
  });

  return (
    <CollapsibleRootContext.Provider value={collapsibleContext}>
      <AccordionItemContext.Provider value={accordionItemContext}>
        {element()}
      </AccordionItemContext.Provider>
    </CollapsibleRootContext.Provider>
  );
}

export interface AccordionItemState extends AccordionRoot.State {
  index: number;
  open: boolean;
}

export interface AccordionItemProps
  extends
    BaseUIComponentProps<'div', AccordionItem.State>,
    Partial<Pick<useCollapsibleRoot.Parameters, 'disabled'>> {
  /**
   * A unique value that identifies this accordion item.
   * If no value is provided, a unique ID will be generated automatically.
   * Use when controlling the accordion programmatically, or to set an initial
   * open state.
   * @example
   * ```tsx
   * <Accordion.Root value={['a']}>
   *   <Accordion.Item value="a" /> // initially open
   *   <Accordion.Item value="b" /> // initially closed
   * </Accordion.Root>
   * ```
   */
  value?: any;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: AccordionItem.ChangeEventDetails) => void)
    | undefined;
}

export type AccordionItemChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;

export type AccordionItemChangeEventDetails =
  BaseUIChangeEventDetails<AccordionItem.ChangeEventReason>;

export namespace AccordionItem {
  export type State = AccordionItemState;
  export type Props = AccordionItemProps;
  export type ChangeEventReason = AccordionItemChangeEventReason;
  export type ChangeEventDetails = AccordionItemChangeEventDetails;
}

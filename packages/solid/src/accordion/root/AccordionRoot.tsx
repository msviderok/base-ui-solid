import { batch, createEffect, createMemo } from 'solid-js';
import { CompositeList } from '../../composite/list/CompositeList';
import { useDirection } from '../../direction-provider/DirectionContext';
import { splitComponentProps } from '../../solid-helpers';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps, Orientation } from '../../utils/types';
import { useControlled } from '../../utils/useControlled';
import { useRenderElement } from '../../utils/useRenderElement';
import { warn } from '../../utils/warn';
import { AccordionRootContext } from './AccordionRootContext';

const rootStateAttributesMapping = {
  value: () => null,
};

/**
 * Groups all parts of the accordion.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionRoot(componentProps: AccordionRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'hiddenUntilFound',
    'keepMounted',
    'loopFocus',
    'onValueChange',
    'multiple',
    'orientation',
    'value',
    'defaultValue',
  ]);
  const disabled = () => local.disabled ?? false;
  const loopFocus = () => local.loopFocus ?? true;
  const multiple = () => local.multiple ?? false;
  const orientation = () => local.orientation ?? 'vertical';

  const direction = useDirection();

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (local.hiddenUntilFound && local.keepMounted === false) {
        warn(
          'The `keepMounted={false}` prop on a Accordion.Root will be ignored when using `hiddenUntilFound` since it requires Panels to remain mounted when closed.',
        );
      }
    });
  }

  // memoized to allow omitting both defaultValue and value
  // which would otherwise trigger a warning in useControlled
  const defaultValue = createMemo(() => {
    if (local.value === undefined) {
      return local.defaultValue ?? [];
    }

    return undefined;
  });

  const accordionItemElements: (HTMLElement | null | undefined)[] = [];

  const [value, setValue] = useControlled({
    controlled: () => local.value,
    default: defaultValue,
    name: 'Accordion',
    state: 'value',
  });

  const handleValueChange = (newValue: number | string, nextOpen: boolean) => {
    const details = createChangeEventDetails(REASONS.none);
    batch(() => {
      if (!multiple()) {
        const nextValue = value()?.[0] === newValue ? [] : [newValue];
        local.onValueChange?.(nextValue, details);
        if (details.isCanceled) {
          return;
        }
        setValue(nextValue);
      } else if (nextOpen) {
        const nextOpenValues = value()?.slice();
        nextOpenValues.push(newValue);
        local.onValueChange?.(nextOpenValues, details);
        if (details.isCanceled) {
          return;
        }
        setValue(nextOpenValues);
      } else {
        const nextOpenValues = value()?.filter((v) => v !== newValue);
        local.onValueChange?.(nextOpenValues, details);
        if (details.isCanceled) {
          return;
        }
        setValue(nextOpenValues);
      }
    });
  };

  const isRtl = () => direction() === 'rtl';
  const isHorizontal = () => orientation() === 'horizontal';

  const state: AccordionRoot.State = {
    get value() {
      return value();
    },
    get disabled() {
      return disabled();
    },
    get orientation() {
      return orientation();
    },
  };

  const contextValue: AccordionRootContext = {
    accordionItemElements,
    direction,
    disabled,
    handleValueChange,
    hiddenUntilFound: () => local.hiddenUntilFound ?? false,
    keepMounted: () => local.keepMounted ?? false,
    loopFocus,
    orientation,
    state,
    value,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [
      {
        get dir() {
          return direction();
        },
        role: 'region',
      },
      elementProps,
    ],
    stateAttributesMapping: rootStateAttributesMapping,
  });

  return (
    <AccordionRootContext.Provider value={contextValue}>
      <CompositeList refs={{ elements: accordionItemElements }}>{element()}</CompositeList>
    </AccordionRootContext.Provider>
  );
}

export type AccordionValue = (any | null)[];

export interface AccordionRootState {
  value: AccordionValue;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  orientation: Orientation;
}

export interface AccordionRootProps extends BaseUIComponentProps<'div', AccordionRoot.State> {
  /**
   * The controlled value of the item(s) that should be expanded.
   *
   * To render an uncontrolled accordion, use the `defaultValue` prop instead.
   */
  value?: AccordionValue | undefined;
  /**
   * The uncontrolled value of the item(s) that should be initially expanded.
   *
   * To render a controlled accordion, use the `value` prop instead.
   */
  defaultValue?: AccordionValue | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Allows the browser’s built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * Event handler called when an accordion item is expanded or collapsed.
   * Provides the new value as an argument.
   */
  onValueChange?:
    | ((value: AccordionValue, eventDetails: AccordionRootChangeEventDetails) => void)
    | undefined;
  /**
   * Whether multiple items can be open at the same time.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * The visual orientation of the accordion.
   * Controls whether roving focus uses left/right or up/down arrow keys.
   * @default 'vertical'
   */
  orientation?: Orientation | undefined;
}

export type AccordionRootChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;

export type AccordionRootChangeEventDetails =
  BaseUIChangeEventDetails<AccordionRoot.ChangeEventReason>;

export namespace AccordionRoot {
  export type State = AccordionRootState;
  export type Props = AccordionRootProps;
  export type ChangeEventReason = AccordionRootChangeEventReason;
  export type ChangeEventDetails = AccordionRootChangeEventDetails;
}

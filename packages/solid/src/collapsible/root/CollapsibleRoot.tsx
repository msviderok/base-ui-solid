import { mergeProps as solidMergeProps } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { CollapsibleRootContext } from './CollapsibleRootContext';
import { collapsibleStateAttributesMapping } from './stateAttributesMapping';
import { useCollapsibleRoot } from './useCollapsibleRoot';

/**
 * Groups all parts of the collapsible.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/solid/components/collapsible)
 */
export function CollapsibleRoot(componentProps: CollapsibleRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'defaultOpen',
    'disabled',
    'onOpenChange',
    'open',
  ]);
  const defaultOpen = () => local.defaultOpen ?? false;
  const disabled = () => local.disabled ?? false;

  const collapsible = useCollapsibleRoot({
    open: () => local.open,
    defaultOpen,
    onOpenChange: (...args) => local.onOpenChange?.(...args),
    disabled,
  });

  const state: CollapsibleRoot.State = {
    get open() {
      return collapsible.open();
    },
    get disabled() {
      return collapsible.disabled();
    },
    get transitionStatus() {
      return collapsible.transitionStatus();
    },
  };

  const contextValue: CollapsibleRootContext = solidMergeProps(collapsible, {
    onOpenChange: local.onOpenChange,
    state,
  } as CollapsibleRootContext);

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping: collapsibleStateAttributesMapping,
  });

  return (
    <CollapsibleRootContext.Provider value={contextValue}>
      {element()}
    </CollapsibleRootContext.Provider>
  );
}

export interface CollapsibleRootState {
  open: boolean;
  disabled: boolean;
  transitionStatus: TransitionStatus;
  hidden?: boolean;
}

export interface CollapsibleRootProps extends BaseUIComponentProps<'div', CollapsibleRoot.State> {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open?: boolean | undefined;

  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export type CollapsibleRootChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;
export type CollapsibleRootChangeEventDetails =
  BaseUIChangeEventDetails<CollapsibleRootChangeEventReason>;

export namespace CollapsibleRoot {
  export type State = CollapsibleRootState;
  export type Props = CollapsibleRootProps;
  export type ChangeEventReason = CollapsibleRootChangeEventReason;
  export type ChangeEventDetails = CollapsibleRootChangeEventDetails;
}

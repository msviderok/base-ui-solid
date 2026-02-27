import { createEffect, createMemo, createSignal, mergeProps as solidMergeProps } from 'solid-js';
import { defaultProps } from '../../solid-helpers';
import { useId } from '../../utils/useId';
import { useFloatingParentNodeId } from '../components/FloatingTree';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { getFloatingFocusElement } from '../utils';
import type { ExtendedUserProps } from './useInteractions';

type AriaRole = 'tooltip' | 'dialog' | 'alertdialog' | 'menu' | 'listbox' | 'grid' | 'tree';
type ComponentRole = 'select' | 'label' | 'combobox';

export interface UseRoleProps {
  /**
   * The role of the floating element.
   * @default 'dialog'
   */
  role?: (AriaRole | ComponentRole) | undefined;
}

const componentRoleToAriaRoleMap = new Map<AriaRole | ComponentRole, AriaRole | false>([
  ['select', 'listbox'],
  ['combobox', 'listbox'],
  ['label', false],
]);

/**
 * Adds base screen reader props to the reference and floating elements for a
 * given floating element `role`.
 * @see https://floating-ui.com/docs/useRole
 */
export function useRole(parameters: {
  context: FloatingRootContext | FloatingContext;
  props?: UseRoleProps;
}): ElementProps {
  const props = defaultProps(parameters.props ?? {}, { role: 'dialog' });

  const store = () =>
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context;
  const open = createMemo(() => store().select('open'));
  const defaultFloatingId = createMemo(() => store().select('floatingId'));
  const domReference = createMemo(() => store().select('domReferenceElement'));
  const floatingElement = createMemo(() => store().select('floatingElement'));

  const defaultReferenceId = useId();
  /**
   * TODO: this needs to be memoized as it causes an infinite loop
   * with the MenuRoot triggerElement assignement
   */
  const referenceId = createMemo(() => domReference()?.id || defaultReferenceId());

  // Track the actual floating element id (including user-provided custom id) after mount.
  const [resolvedFloatingId, setResolvedFloatingId] = createSignal<string | undefined>(undefined);
  createEffect(() => {
    const element = getFloatingFocusElement(floatingElement());
    setResolvedFloatingId(element?.id);
  });
  const floatingId = createMemo(() => resolvedFloatingId() || defaultFloatingId());
  const ariaRole = createMemo(() => componentRoleToAriaRoleMap.get(props.role) ?? props.role);

  const parentId = useFloatingParentNodeId();
  const isNested = parentId != null;

  const shouldDisabledTrigger = createMemo(
    () => ariaRole() === 'tooltip' || props.role === 'label',
  );

  const trigger: ElementProps['trigger'] = {
    get ['aria-haspopup' as string]() {
      if (shouldDisabledTrigger()) {
        return undefined;
      }
      return ariaRole() === 'alertdialog' ? 'dialog' : ariaRole();
    },
    get 'aria-expanded'() {
      if (shouldDisabledTrigger()) {
        return undefined;
      }
      return 'false';
    },
    get role() {
      if (shouldDisabledTrigger()) {
        return undefined;
      }

      if (ariaRole() === 'listbox') {
        return 'combobox';
      }

      if (ariaRole() === 'menu' && isNested) {
        return 'menuitem';
      }

      return undefined;
    },
    get 'aria-autocomplete'() {
      if (shouldDisabledTrigger()) {
        return undefined;
      }

      if (props.role === 'select') {
        return 'none';
      }

      if (props.role === 'combobox') {
        return 'list';
      }

      return undefined;
    },
  };

  const reference: ElementProps['reference'] = solidMergeProps(trigger, {
    get 'aria-labelledby'() {
      if (shouldDisabledTrigger() && props.role === 'label') {
        return open() ? floatingId() : undefined;
      }

      return undefined;
    },
    get 'aria-describedby'() {
      if (shouldDisabledTrigger() && props.role !== 'label') {
        return open() ? floatingId() : undefined;
      }

      return undefined;
    },
    get 'aria-expanded'() {
      if (shouldDisabledTrigger()) {
        return undefined;
      }

      return open() ? 'true' : 'false';
    },
    get 'aria-controls'() {
      if (shouldDisabledTrigger()) {
        return undefined;
      }

      return open() ? floatingId() : undefined;
    },
    get id() {
      if (shouldDisabledTrigger() && props.role === 'menu') {
        return referenceId();
      }

      return undefined;
    },
  });

  const floating: ElementProps['floating'] = {
    get id() {
      return floatingId();
    },
    get role() {
      return ariaRole() as AriaRole | undefined;
    },
    get 'aria-labelledby'() {
      if (shouldDisabledTrigger()) {
        return undefined;
      }

      return ariaRole() === 'menu' ? referenceId() : undefined;
    },
  };

  const item: ElementProps['item'] = (params: ExtendedUserProps) => {
    const commonProps = {
      role: 'option',
      ...(params.active && { id: `${floatingId()}-fui-option` }),
    };

    // For `menu`, we are unable to tell if the item is a `menuitemradio`
    // or `menuitemcheckbox`. For backwards-compatibility reasons, also
    // avoid defaulting to `menuitem` as it may overwrite custom role props.
    switch (props.role) {
      case 'select':
      case 'combobox': {
        return {
          ...commonProps,
          'aria-selected': params.selected,
        };
      }

      default:
    }

    return {};
  };

  return {
    get reference() {
      return reference;
    },
    get floating() {
      return floating;
    },
    get trigger() {
      return trigger;
    },
    item,
  };
}

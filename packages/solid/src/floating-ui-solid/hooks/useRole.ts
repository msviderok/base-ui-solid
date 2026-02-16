import { createEffect, createMemo, createSignal, type Accessor, type JSX } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
import { EMPTY_OBJECT } from '../../utils/constants';
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
  role?: MaybeAccessor<(AriaRole | ComponentRole) | undefined>;
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
export function useRole(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseRoleProps = {},
): Accessor<ElementProps> {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const open = () => store().useState('open')();
  const defaultFloatingId = () => store().useState('floatingId')();
  const domReference = () => store().useState('domReferenceElement')();
  const floatingElement = () => store().useState('floatingElement')();

  const role = () => access(props.role) ?? 'dialog';

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

  const ariaRole = () =>
    (componentRoleToAriaRoleMap.get(role()) ?? role()) as AriaRole | false | undefined;

  const parentId = useFloatingParentNodeId();
  const isNested = parentId != null;

  const trigger = createMemo<ElementProps['trigger']>(() => {
    if (ariaRole() === 'tooltip' || role() === 'label') {
      return EMPTY_OBJECT;
    }

    return {
      'aria-haspopup': ariaRole() === 'alertdialog' ? 'dialog' : ariaRole(),
      'aria-expanded': 'false',
      ...(ariaRole() === 'listbox' && { role: 'combobox' }),
      ...(ariaRole() === 'menu' && isNested && { role: 'menuitem' }),
      ...(role() === 'select' && { 'aria-autocomplete': 'none' }),
      ...(role() === 'combobox' && { 'aria-autocomplete': 'list' }),
    };
  });

  const reference = createMemo<ElementProps['reference']>(() => {
    if (ariaRole() === 'tooltip' || role() === 'label') {
      return {
        [`aria-${role() === 'label' ? 'labelledby' : 'describedby'}`]: open()
          ? floatingId()
          : undefined,
      };
    }

    const triggerProps = trigger();
    return {
      ...triggerProps,
      'aria-expanded': open() ? 'true' : 'false',
      'aria-controls': open() ? floatingId() : undefined,
      ...(ariaRole() === 'menu' && { id: referenceId() }),
    } as JSX.HTMLAttributes<Element>;
  });

  const floating = createMemo<ElementProps['floating']>(() => {
    const floatingProps = {
      id: floatingId(),
      ...(ariaRole() && { role: ariaRole() }),
    } as JSX.HTMLAttributes<HTMLElement>;

    if (ariaRole() === 'tooltip' || role() === 'label') {
      return floatingProps;
    }

    return {
      ...floatingProps,
      ...(ariaRole() === 'menu' && {
        'aria-labelledby': referenceId(),
      }),
    };
  });

  const item: ElementProps['item'] = (params: ExtendedUserProps) => {
    const commonProps = {
      role: 'option',
      ...(params.active && { id: `${floatingId()}-fui-option` }),
    };

    // For `menu`, we are unable to tell if the item is a `menuitemradio`
    // or `menuitemcheckbox`. For backwards-compatibility reasons, also
    // avoid defaulting to `menuitem` as it may overwrite custom role props.
    switch (role()) {
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

  const returnValue = createMemo<ElementProps>(() => ({
    reference: reference(),
    floating: floating(),
    item,
    trigger: trigger(),
  }));

  return returnValue;
}

import { createMemo, type JSX } from 'solid-js';
import { mergeProps } from '../../merge-props';
import type { ElementProps } from '../types';
import { ACTIVE_KEY, FOCUSABLE_ATTRIBUTE, SELECTED_KEY } from '../utils/constants';

export type ExtendedUserProps = {
  [ACTIVE_KEY]?: boolean | undefined;
  [SELECTED_KEY]?: boolean | undefined;
};

export interface UseInteractionsReturn {
  getReferenceProps: <T extends Element>(
    userProps?: JSX.HTMLAttributes<T>,
  ) => Record<string, unknown>;
  getFloatingProps: <T extends HTMLElement>(
    userProps?: JSX.HTMLAttributes<T>,
  ) => Record<string, unknown>;
  getItemProps: <T extends HTMLElement>(
    userProps?: Omit<JSX.HTMLAttributes<T>, 'selected' | 'active'> & ExtendedUserProps,
  ) => Record<string, unknown>;
  getTriggerProps: <T extends Element>(
    userProps?: JSX.HTMLAttributes<T>,
  ) => Record<string, unknown>;
}

/**
 * Merges an array of interaction hooks' props into prop getters, allowing
 * event handler functions to be composed together without overwriting one
 * another.
 * @see https://floating-ui.com/docs/useInteractions
 *
 * TODO: Object.assign from proxy is probably not the best way to do it
 */
export function useInteractions(propsList: Array<ElementProps> = []): UseInteractionsReturn {
  const lists = createMemo(() => {
    const referenceList: JSX.HTMLAttributes<any>[] = [];
    const floatingList: JSX.HTMLAttributes<any>[] = [];
    const itemList: ElementProps['item'][] = [];
    const triggerList: JSX.HTMLAttributes<any>[] = [];
    for (const item of propsList) {
      if (item?.reference) {
        referenceList.push(item.reference);
      }
      if (item?.floating) {
        floatingList.push(item.floating);
      }
      if (item?.item) {
        itemList.push(item.item);
      }
      if (item?.trigger) {
        triggerList.push(item.trigger);
      }
    }

    return {
      reference: referenceList.filter(Boolean),
      floating: floatingList.filter(Boolean),
      item: itemList.filter(Boolean),
      trigger: triggerList.filter(Boolean),
    };
  });

  return {
    getReferenceProps(userProps) {
      return mergeProps([...lists().reference, userProps], { callAllHandlers: true });
    },
    getFloatingProps(userProps) {
      return mergeProps(
        [{ tabIndex: -1, [FOCUSABLE_ATTRIBUTE as any]: '' }, ...lists().floating, userProps],
        { callAllHandlers: true },
      );
    },
    getItemProps(userProps) {
      return mergeProps(
        [...lists().item, { ...userProps, active: undefined, selected: undefined }],
        { callAllHandlers: true },
      );
    },
    getTriggerProps(userProps) {
      return mergeProps([...lists().trigger, userProps], { callAllHandlers: true });
    },
  };
}

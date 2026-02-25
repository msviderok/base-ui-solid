import { combineProps } from '@solid-primitives/props';
import { type JSX } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
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
export function useInteractions(
  propsList: Array<MaybeAccessor<ElementProps> | void> = [],
): UseInteractionsReturn {
  return {
    getReferenceProps(userProps) {
      const referenceList = propsList
        .map((item) => access(item)?.reference)
        .filter((i): i is JSX.HTMLAttributes<any> => !!i);

      if (userProps) {
        referenceList.push(userProps);
      }

      const combined = combineProps(referenceList);

      return Object.assign({}, combined);
    },
    getFloatingProps(userProps) {
      const list = propsList
        .map((item) => access(item)?.floating)
        .filter((i): i is JSX.HTMLAttributes<any> => !!i);

      list.unshift({ tabIndex: -1, [FOCUSABLE_ATTRIBUTE as any]: '' });

      if (userProps) {
        list.push(userProps);
      }

      const combined = combineProps(list);

      return Object.assign({}, combined);
    },
    getItemProps(userProps) {
      let list: ElementProps['item'][] = propsList
        .map((item) => access(item)?.item)
        .filter((i) => !!i);

      if (userProps) {
        const userPropsWitoutActiveAndSelected = { ...userProps };
        delete userPropsWitoutActiveAndSelected[ACTIVE_KEY];
        delete userPropsWitoutActiveAndSelected[SELECTED_KEY];
        list.push(userPropsWitoutActiveAndSelected as ElementProps['item']);
      }

      list = list.map((item) => (typeof item === 'function' ? item(userProps ?? {}) : item));

      const combined = combineProps(list);

      return Object.assign({}, combined);
    },
    getTriggerProps(userProps) {
      const list = propsList
        .map((item) => access(item)?.trigger)
        .filter((i): i is JSX.HTMLAttributes<any> => !!i);

      if (userProps) {
        list.push(userProps);
      }

      const combined = combineProps(list);

      return Object.assign({}, combined);
    },
  };
}

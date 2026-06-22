import { $PROXY, mergeProps as solidMergeProps, type Accessor, type JSX } from 'solid-js';
import type { ElementProps } from '../types';
import { ACTIVE_KEY, FOCUSABLE_ATTRIBUTE, SELECTED_KEY } from '../utils/constants';

// Local copy of @solid-primitives/props combineProps and propTraps.
// MIT, Copyright (c) 2021 Solid Primitives Working Group.
type MaybeAccessor<T> = T | (() => T);
type EventHandler = (...args: any[]) => unknown;

type PropsInput = {
  class?: string;
  className?: string;
  classList?: Record<string, boolean | undefined>;
  style?: JSX.CSSProperties | string;
  ref?: Element | ((el: any) => void);
} & Record<string, any>;

type CombinePropsOptions = {
  reverseEventHandlers?: boolean;
};

const propTraps: ProxyHandler<{
  get: (k: string | number | symbol) => any;
  has: (k: string | number | symbol) => boolean;
  keys: () => string[];
}> = {
  get(_, property, receiver) {
    if (property === $PROXY) {
      return receiver;
    }

    return _.get(property);
  },
  has(_, property) {
    return _.has(property);
  },
  set() {
    return true;
  },
  deleteProperty() {
    return true;
  },
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set() {
        return true;
      },
      deleteProperty() {
        return true;
      },
    };
  },
  ownKeys(_) {
    return _.keys();
  },
};

const extractCSSregex = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;

function access<T>(value: MaybeAccessor<T>): T {
  if (typeof value === 'function' && !value.length) {
    return (value as () => T)();
  }

  return value as T;
}

function chain(callbacks: Array<EventHandler | undefined>) {
  return (...args: any[]) => {
    for (const callback of callbacks) {
      callback?.(...args);
    }
  };
}

function reverseChain(callbacks: Array<EventHandler | undefined>) {
  return (...args: any[]) => {
    for (let i = callbacks.length - 1; i >= 0; i -= 1) {
      callbacks[i]?.(...args);
    }
  };
}

function stringStyleToObject(style: string): JSX.CSSProperties {
  const object: Record<string, string> = {};
  let match: RegExpExecArray | null;

  while ((match = extractCSSregex.exec(style))) {
    object[match[1]!] = match[2]!;
  }

  return object;
}

function combineStyle(a: string, b: string): string;
function combineStyle(
  a: JSX.CSSProperties | undefined,
  b: JSX.CSSProperties | undefined,
): JSX.CSSProperties;
function combineStyle(
  a: JSX.CSSProperties | string | undefined,
  b: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties;
function combineStyle(
  a: JSX.CSSProperties | string | undefined,
  b: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties | string {
  if (typeof a === 'string') {
    if (typeof b === 'string') {
      return `${a};${b}`;
    }

    a = stringStyleToObject(a);
  } else if (typeof b === 'string') {
    b = stringStyleToObject(b);
  }

  return { ...a, ...b };
}

function reduce<K extends keyof PropsInput>(
  sources: Array<MaybeAccessor<PropsInput>>,
  key: K,
  calc: (a: NonNullable<PropsInput[K]>, b: NonNullable<PropsInput[K]>) => PropsInput[K],
) {
  let value: PropsInput[K] | undefined;

  for (const props of sources) {
    const propValue = access(props)[key];

    if (!value) {
      value = propValue;
    } else if (propValue) {
      value = calc(value, propValue);
    }
  }

  return value;
}

function combineProps<T extends Array<MaybeAccessor<PropsInput>>>(
  sources: T,
  options?: CombinePropsOptions,
): Record<string, unknown>;
function combineProps<T extends Array<MaybeAccessor<PropsInput>>>(
  ...sources: T
): Record<string, unknown>;
function combineProps(...args: any[]): Record<string, unknown> {
  const restArgs = Array.isArray(args[0]);
  const sources = (restArgs ? args[0] : args) as Array<MaybeAccessor<PropsInput>>;

  if (sources.length === 1) {
    return sources[0] as Record<string, unknown>;
  }

  const chainFn = restArgs && args[1]?.reverseEventHandlers ? reverseChain : chain;
  const listeners: Record<string, EventHandler[]> = {};

  for (const props of sources) {
    const propsObj = access(props);

    for (const key in propsObj) {
      if (key[0] === 'o' && key[1] === 'n' && key[2]) {
        const value = propsObj[key];
        const name = key.toLowerCase();
        const callback =
          typeof value === 'function'
            ? value
            : Array.isArray(value)
              ? value.length === 1
                ? value[0]
                : value[0].bind(undefined, value[1])
              : undefined;

        if (callback) {
          listeners[name] ? listeners[name].push(callback) : (listeners[name] = [callback]);
        } else {
          delete listeners[name];
        }
      }
    }
  }

  const merge = solidMergeProps(...sources);

  return new Proxy(
    {
      get(key) {
        if (typeof key !== 'string') {
          return Reflect.get(merge, key);
        }

        if (key === 'style') {
          return reduce(sources, 'style', combineStyle);
        }

        if (key === 'ref') {
          const callbacks = [];

          for (const props of sources) {
            const callback = access(props)[key];

            if (typeof callback === 'function') {
              callbacks.push(callback);
            }
          }

          return chainFn(callbacks);
        }

        if (key[0] === 'o' && key[1] === 'n' && key[2]) {
          const callbacks = listeners[key.toLowerCase()];
          return callbacks ? chainFn(callbacks) : Reflect.get(merge, key);
        }

        if (key === 'class' || key === 'className') {
          return reduce(sources, key, (a, b) => `${a} ${b}`);
        }

        if (key === 'classList') {
          return reduce(sources, key, (a, b) => ({ ...a, ...b }));
        }

        return Reflect.get(merge, key);
      },
      has(key) {
        return Reflect.has(merge, key);
      },
      keys() {
        return Object.keys(merge);
      },
    },
    propTraps,
  );
}

export type ExtendedUserProps = {
  [ACTIVE_KEY]?: boolean;
  [SELECTED_KEY]?: boolean;
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
  propsList: Array<Accessor<ElementProps> | void> = [],
): UseInteractionsReturn {
  return {
    getReferenceProps(userProps) {
      const referenceList = propsList
        .map((item) => item?.()?.reference)
        .filter((i): i is JSX.HTMLAttributes<any> => !!i);

      if (userProps) {
        referenceList.push(userProps);
      }

      const combined = combineProps(referenceList);

      return Object.assign({}, combined);
    },
    getFloatingProps(userProps) {
      const list = propsList
        .map((item) => item?.()?.floating)
        .filter((i): i is JSX.HTMLAttributes<any> => !!i);

      list.unshift({ tabIndex: -1, [FOCUSABLE_ATTRIBUTE as any]: '' });

      if (userProps) {
        list.push(userProps);
      }

      const combined = combineProps(list);

      return Object.assign({}, combined);
    },
    getItemProps(userProps) {
      let list: ElementProps['item'][] = propsList.map((item) => item?.()?.item).filter((i) => !!i);

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
  };
}

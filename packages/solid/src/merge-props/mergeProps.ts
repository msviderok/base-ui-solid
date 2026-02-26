/* eslint-disable @typescript-eslint/no-loop-func */
/**
 * Based on the original implementation of combineProps from @solid-primitives/props:
 * https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/props/src/combineProps.ts
 */

/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-cond-assign */
/* eslint-disable curly */
/* eslint-disable guard-for-in */

import {
  $PROXY,
  mergeProps as solidMergeProps,
  type ComponentProps,
  type JSX,
  type Ref,
} from 'solid-js';
import type { BaseUIEvent, WithBaseUIEvent } from '../utils/types';

type EventHandler = (...args: any[]) => unknown;

export interface MergePropsOptions {
  /**
   * When true, all event handlers execute and the first non-undefined
   * result is returned (matching React's useInteractions mergeProps behavior).
   * When false/omitted, uses the default preventable chaining where
   * `event.preventBaseUIHandler()` can stop earlier handlers.
   */
  callAllHandlers?: boolean;
}

function isMergePropsOptions(value: unknown): value is MergePropsOptions {
  return typeof value === 'object' && value !== null && 'callAllHandlers' in value;
}

function trueFn() {
  return true;
}

const propTraps: ProxyHandler<{
  get: (k: string | number | symbol) => any;
  has: (k: string | number | symbol) => boolean;
  keys: () => string[];
}> = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver;
    return _.get(property);
  },
  has(_, property) {
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn,
    };
  },
  ownKeys(_) {
    return _.keys();
  },
};

const extractCSSregex = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;

/**
 * converts inline string styles to object form
 * @example
 * const styles = stringStyleToObject("margin: 24px; border: 1px solid #121212");
 * styles; // { margin: "24px", border: "1px solid #121212" }
 * */
export function stringStyleToObject(style: string): JSX.CSSProperties {
  const object: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = extractCSSregex.exec(style))) {
    object[match[1]!] = match[2]!;
  }
  return object;
}

/**
 * Combines two set of styles together. Accepts both string and object styles.\
 * @example
 * const styles = combineStyle("margin: 24px; border: 1px solid #121212", {
 *   margin: "2rem",
 *   padding: "16px"
 * });
 * styles; // { margin: "2rem", border: "1px solid #121212", padding: "16px" }
 */
export function combineStyle(a: string, b: string): string;
export function combineStyle(
  a: JSX.CSSProperties | undefined,
  b: JSX.CSSProperties | undefined,
): JSX.CSSProperties;
export function combineStyle(
  a: JSX.CSSProperties | string | undefined,
  b: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties;
export function combineStyle(
  a: JSX.CSSProperties | string | undefined,
  b: JSX.CSSProperties | string | undefined,
): JSX.CSSProperties | string {
  if (typeof a === 'string') {
    if (typeof b === 'string') return `${a};${b}`;

    a = stringStyleToObject(a);
  } else if (typeof b === 'string') {
    b = stringStyleToObject(b);
  }

  return { ...a, ...b };
}

type ElementType = keyof JSX.IntrinsicElements;
type PropsOf<T extends ElementType> = WithBaseUIEvent<ComponentProps<T>>;
export type MergablePropsCallback<T extends ElementType> = (otherProps: PropsOf<T>) => PropsOf<T>;

type PropsInput<T extends ElementType> = PropsOf<T> | MergablePropsCallback<T> | undefined;

const reduce = <T, K extends keyof T>(
  sources: Iterable<T>,
  key: K,
  calc: (a: NonNullable<T[K]>, b: NonNullable<T[K]>) => T[K],
) => {
  let v: T[K] | undefined;
  for (const value of sources) {
    if (!v) v = value[key];
    else if (value[key]) v = calc(v, value[key]);
  }
  return v;
};

/**
 * A helper that reactively merges multiple props objects together while smartly combining some of Solid's JSX/DOM attributes.
 *
 * Event handlers and refs are chained, class, classNames and styles are combined.
 * For all other props, the last prop object overrides all previous ones. Similarly to {@link mergeProps}
 * @param sources - Multiple sets of props to combine together.
 * @example
 * ```tsx
 * const MyButton: Component<ButtonProps> = props => {
 *    const { buttonProps } = createButton();
 *    const combined = combineProps(props, buttonProps);
 *    return <button {...combined} />
 * }
 * // component consumer can provide button props
 * // they will be combined with those provided by createButton() primitive
 * <MyButton style={{ margin: "24px" }} />
 * ```
 */
export function mergeProps<
  E extends ElementType | undefined = undefined,
  Args extends Array<any> = PropsInput<E extends ElementType ? E : any>[],
  R = PropsOf<E extends ElementType ? E : any>,
>(sources: Args, options?: MergePropsOptions): R;
export function mergeProps<
  E extends ElementType | undefined = undefined,
  Args extends Array<any> = PropsInput<E extends ElementType ? E : any>[],
  R = PropsOf<E extends ElementType ? E : any>,
>(...sources: Args): R;
export function mergeProps<
  E extends ElementType | undefined = undefined,
  Args extends Array<any> = PropsInput<E extends ElementType ? E : any>[],
  R = PropsOf<E extends ElementType ? E : any>,
>(...args: Args): R {
  let rawArgs = args as unknown[];
  let options: MergePropsOptions | undefined;

  // Detect options as the last argument
  const lastArg = rawArgs[rawArgs.length - 1];
  if (isMergePropsOptions(lastArg)) {
    options = lastArg;
    rawArgs = rawArgs.slice(0, -1);
  }

  const sources = (Array.isArray(rawArgs[0]) ? rawArgs[0] : rawArgs) as Args;
  const callAll = options?.callAllHandlers === true;

  let cachedListeners = {} as Record<string, EventHandler | undefined>;
  let cachedListenerArrays = {} as Record<string, EventHandler[]>;
  let cacheStyles = [] as JSX.HTMLAttributes<any>[];
  let cacheRefs = [] as Array<Ref<any>>;
  let cacheClasses = [] as JSX.HTMLAttributes<any>[];
  let cacheClassList = [] as JSX.HTMLAttributes<any>[];
  const lastDescriptor = {} as Record<string, PropertyDescriptor | undefined>;

  /*
   * Track the last property descriptor for each key to handle explicit undefined values.
   * Solid's mergeProps doesn't overwrite with undefined, but React's mergeProps does.
   * We need to match React's behavior where explicit undefined should overwrite.
   */

  let merge = {} as Record<string, unknown>;
  for (let props of sources) {
    let propsOverride = false;
    if (typeof props === 'function') {
      const mergedListeners = callAll
        ? buildCallAllListeners(Object.assign({}, cachedListenerArrays))
        : Object.assign({}, cachedListeners);
      const mergedStyles = Object.assign([], cacheStyles);
      const mergedRefs = Object.assign([], cacheRefs);
      const mergedClasses = Object.assign([], cacheClasses);
      const mergedClassList = Object.assign([], cacheClassList);

      const localMerged = {
        get style() {
          return reduce(mergedStyles, 'style', combineStyle);
        },
        get ref() {
          return reverseChain(mergedRefs);
        },
        get class() {
          return reduce(mergedClasses, 'class', (a, b) => `${b} ${a}`);
        },
        get classList() {
          return reduce(mergedClassList, 'classList', (a, b) => ({ ...a, ...b }));
        },
      };

      const mergedForGetter = new Proxy(merge, {
        get(target, key, receiver) {
          if (typeof key !== 'string') return Reflect.get(target, key, receiver);
          if (key in localMerged) return localMerged[key as keyof typeof localMerged];

          if (key[0] === 'o' && key[1] === 'n' && key[2]) {
            const name = key.toLowerCase();
            if (name in mergedListeners) return mergedListeners[name];
          }

          return Reflect.get(target, key, receiver);
        },
      });

      propsOverride = true;
      props = props(mergedForGetter);

      cachedListeners = {};
      cachedListenerArrays = {};
      cacheStyles = [];
      cacheRefs = [];
      cacheClasses = [];
      cacheClassList = [];
    }

    for (const key in props) {
      /*
       * Track all descriptors before any special handling so we can later
       * check if the final value should be undefined
       */
      lastDescriptor[key] = Object.getOwnPropertyDescriptor(props, key);

      if (key === 'style') {
        cacheStyles.push(props as any);
        continue;
      }

      if (key === 'ref') {
        if (typeof props[key] === 'function') {
          cacheRefs.push(props[key]);
        }
        continue;
      }

      if (key === 'class' || key === 'className') {
        cacheClasses.push(props as any);
        continue;
      }

      if (key === 'classList') {
        cacheClassList.push(props as any);
        continue;
      }

      // event listeners
      if (key[0] === 'o' && key[1] === 'n' && key[2]) {
        const v = props[key];
        const name = key.toLowerCase();

        const callback: EventHandler | undefined =
          typeof v === 'function'
            ? v
            : // jsx event handlers can be tuples of [callback, arg]
              Array.isArray(v)
              ? v.length === 1
                ? v[0]
                : v[0].bind(void 0, v[1])
              : void 0;

        if (callback) {
          if (callAll) {
            if (!cachedListenerArrays[name]) {
              cachedListenerArrays[name] = [];
            }
            cachedListenerArrays[name].push(callback);
          } else {
            cachedListeners[name] = mergeEventHandlers(cachedListeners[name], callback);
          }
        }
      }
    }

    // eslint-disable-next-line solid/reactivity
    merge = propsOverride ? (props ?? {}) : solidMergeProps(merge, props);
  }

  const mergedListeners = callAll
    ? buildCallAllListeners(cachedListenerArrays)
    : { ...cachedListeners };
  const localMerged = {
    get style() {
      return reduce(cacheStyles, 'style', combineStyle);
    },
    get ref() {
      return reverseChain(cacheRefs);
    },
    get class() {
      return reduce(cacheClasses, 'class', (a, b) => `${b} ${a}`);
    },
    get classList() {
      return reduce(cacheClassList, 'classList', (a, b) => ({ ...a, ...b }));
    },
  };

  return new Proxy(
    {
      get(key) {
        if (typeof key !== 'string') return Reflect.get(merge, key);
        if (key in localMerged) return localMerged[key as keyof typeof localMerged];

        if (key[0] === 'o' && key[1] === 'n' && key[2]) {
          const name = key.toLowerCase();
          if (name in mergedListeners) return mergedListeners[name];
        }

        /*
         * Check if the last descriptor for this key resolves to undefined.
         * This handles the case where explicit undefined should overwrite previous values,
         * matching React's mergeProps behavior.
         */
        const desc = lastDescriptor[key];
        if (desc) {
          const value = desc.get ? desc.get() : desc.value;
          if (value === undefined) {
            return undefined;
          }
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
  ) as any;
}

/**
 * https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/utils/src/index.ts#L82-L94
 * Returns a function that will call all functions in the reversed order with the same arguments.
 */
export function reverseChain<Args extends [] | any[]>(
  callbacks: (((...args: Args) => any) | undefined)[],
): (...args: Args) => void {
  return (...args: Args) => {
    for (let i = callbacks.length - 1; i >= 0; i--) {
      const callback = callbacks[i];
      callback?.(...args);
    }
  };
}

function buildCallAllListeners(
  listenerArrays: Record<string, EventHandler[]>,
): Record<string, EventHandler> {
  const result = {} as Record<string, EventHandler>;
  for (const name in listenerArrays) {
    const handlers = listenerArrays[name];
    result[name] = (...args: any[]) => {
      return handlers.map((fn) => fn(...args)).find((val) => val !== undefined);
    };
  }
  return result;
}

function mergeEventHandlers(
  ourHandler: EventHandler | undefined,
  theirHandler: EventHandler | undefined,
): (...args: any[]) => void {
  if (!theirHandler) {
    return ourHandler as any;
  }
  if (!ourHandler) {
    return theirHandler as any;
  }

  return (event: unknown) => {
    if (event instanceof Event) {
      const baseUIEvent = event as BaseUIEvent<typeof event>;

      makeEventPreventable(baseUIEvent);

      const result = theirHandler(baseUIEvent);

      if (!baseUIEvent.baseUIHandlerPrevented) {
        ourHandler?.(baseUIEvent);
      }

      return result;
    }

    const result = theirHandler(event);
    ourHandler?.(event);
    return result;
  };
}

export function makeEventPreventable<T extends Event>(event: BaseUIEvent<T>) {
  event.preventBaseUIHandler = () => {
    (event.baseUIHandlerPrevented as boolean) = true;
  };

  return event;
}

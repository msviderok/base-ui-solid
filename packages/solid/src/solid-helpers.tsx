import {
  children,
  createMemo,
  onMount,
  Show,
  mergeProps as solidMergeProps,
  splitProps,
  type Accessor,
  type JSX,
  type SplitProps,
} from 'solid-js';
import type { PayloadChildRenderFunction } from './utils/popups';

export function callEventHandler<T, E extends Event>(
  eventHandler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget?: T; target?: Element },
) {
  if (eventHandler) {
    if (typeof eventHandler === 'function') {
      eventHandler(event);
    } else {
      eventHandler[0](eventHandler[1], event);
    }
  }

  return event.defaultPrevented;
}

export type Accessify<T, AccessorKeys extends keyof T> = {
  [K in keyof T]: K extends AccessorKeys ? Accessor<T[K]> : T[K];
};

// https://github.com/solidjs-community/solid-primitives/blob/461ab9edda2ffa6666d7ed2d5deed8b6b77f65a6/packages/utils/src/types.ts#L29
export type MaybeAccessor<T> = T | Accessor<T>;

// https://github.com/solidjs-community/solid-primitives/blob/461ab9edda2ffa6666d7ed2d5deed8b6b77f65a6/packages/utils/src/types.ts#L42C1-L44C7
export type MaybeAccessorValue<T extends MaybeAccessor<any>> = T extends () => any
  ? ReturnType<T>
  : T;

export function autofocus(element: HTMLElement, autofocusProp: Accessor<boolean>) {
  if (autofocusProp?.() === false) {
    return;
  }

  onMount(() => {
    if (element.hasAttribute('autofocus')) {
      queueMicrotask(() => element.focus());
    }
  });
}

// https://github.com/solidjs-community/solid-primitives/blob/461ab9edda2ffa6666d7ed2d5deed8b6b77f65a6/packages/utils/src/index.ts#L106C1-L107C59
export function access<V extends MaybeAccessor<unknown>>(
  v: V,
): V extends Accessor<infer U> ? U : V {
  return typeof v === 'function' && !v.length ? (v as Function)() : (v as any);
}

export type Args<T extends ((...args: any[]) => any) | undefined | null> = Parameters<
  Exclude<T, undefined | null>
>;

export function splitComponentProps<
  T extends Record<any, any>,
  K extends [readonly (keyof T)[], ...(readonly (keyof T)[])[]],
>(props: T, ...keys: K) {
  const [componentProps, ...others] = splitProps(props, ['class', 'render'], ...keys);
  return [componentProps, ...others] as unknown as SplitProps<
    T,
    [componentPropsToOmit: ['class', 'render'], ...K]
  >;
}

export type CodependentRefs<T extends string[]> = {
  [K in T[number]]?: {
    ref: Accessor<HTMLElement | null | undefined>;
    id: Accessor<string | undefined>;
    explicitId: Accessor<string | undefined>;
  };
};

// https://github.com/solidjs/solid/issues/2478#issuecomment-2888503241
export function childrenLazy(resolver: () => JSX.Element) {
  const _s = Symbol();
  let x: any = _s;
  return () => {
    if (x === _s) {
      x = children(resolver);
    }
    return x;
  };
}

export type ReactLikeRef<T> = { current: T };
export function useRef<T>(initialValue: T): ReactLikeRef<T>;
export function useRef<T>(initialValue: T | null): ReactLikeRef<T | null>;
export function useRef<T>(initialValue: T | undefined): ReactLikeRef<T | undefined> {
  const ref = { current: initialValue };
  return ref;
}

type Simplify<T> = T extends any ? { [K in keyof T]: T[K] } : T;
type OnlyDeclaredProps<P, D extends Partial<P>> = {
  -readonly [K in keyof D]-?: D[K] | Exclude<P[K extends keyof P ? K : never], undefined>;
};

export type PropsMergeWithDefault<P, D extends Partial<P>> = Simplify<{
  [K in keyof (P & OnlyDeclaredProps<P, D>)]: K extends keyof D
    ? OnlyDeclaredProps<P, D>[K]
    : P[K extends keyof P ? K : never];
}>;

export function defaultProps<
  P,
  D extends Partial<P>,
  C extends { [K in Extract<keyof D, keyof P> as keyof D]?: D[K] },
>(props: P, defaults: D extends C ? D : C) {
  // eslint-disable-next-line solid/reactivity
  return solidMergeProps(defaults, props) as PropsMergeWithDefault<P, D>;
}

export function ComponentWithPayload<Payload>(props: {
  children: JSX.Element | PayloadChildRenderFunction<Payload>;
  payload: Accessor<Payload | undefined>;
}) {
  const cachedChildren = children(() => props.children as any);
  const childrenFn = createMemo(() => {
    const child = cachedChildren();
    return typeof child === 'function' ? (child as PayloadChildRenderFunction<Payload>) : null;
  });

  return (
    <Show when={childrenFn()} fallback={cachedChildren()}>
      {(fn) => <>{fn()({ payload: props.payload() })}</>}
    </Show>
  );
}

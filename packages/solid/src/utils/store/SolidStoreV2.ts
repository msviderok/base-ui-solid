import { createEffect, createMemo, createRoot, on, onCleanup, type Accessor } from 'solid-js';
import { createStore, produce, type SetStoreFunction, type Store } from 'solid-js/store';
import { access, type MaybeAccessor, type MaybeAccessorValue } from '../../solid-helpers';
import { NOOP } from '../empty';

/**
 * A Store that supports controlled state keys, non-reactive values and provides utility methods for React.
 */
export function SolidStore<
  State extends object,
  Context extends object = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
>(
  initialState: State | [Store<State>, SetStoreFunction<State>],
  initialContext: Context = {} as Context,
  selectors?: Selectors,
) {
  let controlledValues: Map<keyof State, boolean> | undefined;
  const context = initialContext;
  const [state, setState] = createInitialStore(initialState);

  function update(statePart: Partial<State>) {
    setState(statePart as any);
  }

  function useSyncedValue<Key extends keyof State, Value extends State[Key]>(
    key: keyof State,
    value: Accessor<Value>,
  ) {
    createEffect(() => setState(key as any, value()));
  }

  function useSyncedValueWithCleanup<Key extends KeysAllowingUndefined<State>>(
    key: Key,
    value: Accessor<State[Key]>,
  ) {
    useSyncedValue(key, value);
    onCleanup(() => setState(key as any, undefined));
  }

  function useSyncedValues<Keys extends keyof State>(
    statePart: Accessor<Partial<State>> | Partial<{ [Key in Keys]: MaybeAccessor<State[Key]> }>,
  ) {
    const partialState = createMemo(
      () => access(statePart) as Partial<{ [Key in Keys]: MaybeAccessor<State[Key]> }>,
    );

    if (process.env.NODE_ENV !== 'production') {
      // Check that an object with the same shape is passed on every render
      // eslint-disable-next-line solid/reactivity
      const keys = Object.keys(partialState()) as Array<keyof State>;

      const nextKeys = createMemo(() => Object.keys(partialState()) as Array<keyof State>);
      createEffect(() => {
        const next = nextKeys();
        if (keys.length !== next.length || keys.some((key, index) => key !== next[index])) {
          console.error(
            'SolidStore.useSyncedValues expects the same prop keys on every render. Keys should be stable.',
          );
        }
      });
    }

    createEffect(() => {
      const part = partialState();
      setState(
        produce((currentState) => {
          // eslint-disable-next-line guard-for-in
          for (const key in part) {
            currentState[key] = access(part[key]) as any;
          }
        }),
      );
    });
  }

  function useControlledProp<Key extends keyof State, Value extends State[Key]>(
    key: keyof State,
    controlledProp: Value | Accessor<Value | undefined> | undefined,
  ): void {
    const controlled = createMemo(() => access(controlledProp));
    const isControlled = createMemo(() => controlled() !== undefined);

    createEffect(() => {
      if (isControlled() && !Object.is(state[key], controlled())) {
        // Set the internal state to match the controlled value.
        setState(key as any, controlled());
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      createEffect(() => {
        // eslint-disable-next-line
        const cache = (controlledValues ??= new Map<keyof State, boolean>());
        if (!cache.has(key)) {
          cache.set(key, isControlled());
        }

        const previouslyControlled = cache.get(key);
        if (previouslyControlled !== undefined && previouslyControlled !== isControlled()) {
          console.error(
            `A component is changing the ${
              isControlled() ? '' : 'un'
            }controlled state of ${key.toString()} to be ${isControlled() ? 'un' : ''}controlled. Elements should not switch from uncontrolled to controlled (or vice versa).`,
          );
        }
      });
    }
  }

  function select<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): ReturnType<Selectors[Key]> {
    return selectors![key](state, ...args);
  }

  function useState<Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): Accessor<MaybeAccessorValue<ReturnType<Selectors[Key]>>> {
    if (selectors && key in selectors) {
      return () => selectors![key](state, ...args);
    }

    // eslint-disable-next-line solid/reactivity
    return createMemo(() => access(state[key as unknown as keyof State]) as any);
  }

  function useContextCallback<Key extends ContextFunctionKeys<Context>>(
    key: Key,
    fn: ContextFunction<Context, Key> | undefined,
  ) {
    (context as any)[key] = fn ?? (NOOP as ContextFunction<Context, Key>);
  }

  function useStateSetter<const Key extends keyof State, Value extends State[Key]>(key: Key) {
    return (value: Value) => setState(key as any, value as any);
  }

  function observe<Key extends keyof Selectors>(
    selector: Key,
    listener: (
      newValue: ReturnType<Selectors[Key]>,
      oldValue: ReturnType<Selectors[Key]>,
      store: Store<State>,
    ) => void,
  ): () => void;

  function observe<Selector extends ObserveSelector<State>>(
    selector: Selector,
    listener: (
      newValue: ReturnType<Selector>,
      oldValue: ReturnType<Selector>,
      store: Store<State>,
    ) => void,
  ): () => void;

  function observe(
    selector: keyof Selectors | ObserveSelector<State>,
    listener: (newValue: any, oldValue: any, store: Store<State>) => void,
  ) {
    let unsubscribe!: () => void;

    createRoot((dispose) => {
      unsubscribe = dispose;
      let renderCount = 0;

      const data = createMemo(() =>
        typeof selector === 'function' ? selector(state) : selectors![selector](state),
      );

      createEffect(
        on(data, (nextValue, prevValue) => {
          const prev = renderCount === 0 ? nextValue : prevValue;
          renderCount += 1;
          return listener(nextValue, prev, state);
        }),
      );
    });

    return unsubscribe;
  }

  return {
    state,
    setState,
    set: setState,
    context,
    update,
    useSyncedValue,
    useSyncedValueWithCleanup,
    useSyncedValues,
    useControlledProp,
    select,
    useState,
    useContextCallback,
    useStateSetter,
    observe,
  };
}

function createInitialStore<State extends object>(
  initialState: State | [Store<State>, SetStoreFunction<State>],
) {
  if (Array.isArray(initialState)) {
    return initialState;
  }

  const [state, setState] = createStore(initialState);
  return [state, setState] as const;
}

type MaybeCallable = (...args: any[]) => any;

type ContextFunctionKeys<Context> = {
  [Key in keyof Context]-?: Extract<Context[Key], MaybeCallable> extends never ? never : Key;
}[keyof Context];

type ContextFunction<Context, Key extends keyof Context> = Extract<Context[Key], MaybeCallable>;

type KeysAllowingUndefined<State> = {
  [Key in keyof State]-?: undefined extends State[Key] ? Key : never;
}[keyof State];

type ObserveSelector<State> = (state: State) => any;

type SelectorFunction<State, Args extends any[] = any[]> = (state: State, ...args: Args) => any;

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

export type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;

export type SolidStore<
  State extends object,
  Context extends object = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> = ReturnType<typeof SolidStore<State, Context, Selectors>>;

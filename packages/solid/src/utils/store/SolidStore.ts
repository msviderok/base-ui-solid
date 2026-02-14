import { NOOP } from '@base-ui/utils/empty';
import { createEffect, createMemo, createRoot, on, onCleanup, type Accessor } from 'solid-js';
import type { SetStoreFunction, Store } from 'solid-js/store';
import { createStore, produce } from 'solid-js/store';
import { access, type MaybeAccessor, type MaybeAccessorValue } from '../../solid-helpers';

/**
 * A Store that supports controlled state keys, non-reactive values and provides utility methods for React.
 */
export class SolidStore<
  State extends Record<string, MaybeAccessor<unknown>>,
  Context = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> {
  state: Store<State>;
  setState: SetStoreFunction<State>;
  update: SetStoreFunction<State>;
  set: SetStoreFunction<State>;

  /**
   * Creates a new ReactStore instance.
   *
   * @param state Initial state of the store.
   * @param context Non-reactive context values.
   * @param selectors Optional selectors for use with `useState`.
   */
  constructor(state: State, context: Context = {} as Context, selectors?: Selectors) {
    const [internalState, setInternalState] = createStore<State>(state);
    // eslint-disable-next-line solid/reactivity
    this.state = internalState;
    this.setState = setInternalState;
    this.update = setInternalState;
    this.set = setInternalState;
    this.context = context;
    this.selectors = selectors;
  }

  /**
   * Non-reactive values such as refs, callbacks, etc.
   */
  readonly context: Context;

  private selectors: Selectors | undefined;

  /**
   * Synchronizes a single external value into the store.
   *
   * Note that the while the value in `state` is updated immediately, the value returned
   * by `useState` is updated before the next render (similarly to React's `useState`).
   */
  useSyncedValue<Key extends keyof State, Value extends State[Key]>(
    key: keyof State,
    value: Value,
  ) {
    createEffect(() => {
      this.setState(key as any, value as any);
    });
  }

  /**
   * Synchronizes a single external value into the store and
   * cleans it up (sets to `undefined`) on unmount.
   *
   * Note that the while the value in `state` is updated immediately, the value returned
   * by `useState` is updated before the next render (similarly to React's `useState`).
   */
  public useSyncedValueWithCleanup<Key extends KeysAllowingUndefined<State>>(
    key: Key,
    value: State[Key],
  ) {
    this.useSyncedValue(key, value);
    onCleanup(() => this.setState(key as any, undefined as any));
  }

  /**
   * Synchronizes multiple external values into the store.
   *
   * Note that the while the values in `state` are updated immediately, the values returned
   * by `useState` are updated before the next render (similarly to React's `useState`).
   */
  public useSyncedValues(statePart: Partial<State>) {
    if (process.env.NODE_ENV !== 'production') {
      // Check that an object with the same shape is passed on every render
      const keys = Object.keys(statePart) as Array<keyof State>;

      const nextKeys = createMemo(() => Object.keys(statePart));
      createEffect(() => {
        if (
          keys.length !== nextKeys().length ||
          keys.some((key, index) => key !== nextKeys()[index])
        ) {
          console.error(
            'SolidStore.useSyncedValues expects the same prop keys on every render. Keys should be stable.',
          );
        }
      });
    }

    createEffect(() => {
      this.setState(
        produce((currentState) => {
          // eslint-disable-next-line guard-for-in
          for (const key in statePart) {
            currentState[key] = statePart[key] as any;
          }
        }),
      );
    });
  }

  /**
   * Registers a controllable prop pair (`controlled`, `defaultValue`) for a specific key. If `controlled`
   * is non-undefined, the store's state at `key` is updated to match `controlled`.
   */
  useControlledProp<Key extends keyof State, Value extends State[Key]>(
    key: keyof State,
    controlled: MaybeAccessor<Value | undefined>,
  ): void {
    const isControlled = () => access(controlled) !== undefined;

    createEffect(() => {
      if (isControlled() && !Object.is(this.state[key], access(controlled))) {
        // Set the internal state to match the controlled value.
        this.setState({ ...this.state, [key]: access(controlled) });
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      createEffect(() => {
        // eslint-disable-next-line
        const cache = ((this as any).controlledValues ??= new Map<keyof State, boolean>());
        if (!cache.has(key)) {
          cache.set(key, isControlled);
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

  /** Gets the current value from the store using a selector with the provided key.
   *
   * @param key Key of the selector to use.
   */
  select = <Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): ReturnType<Selectors[Key]> => {
    return access(this.selectors![key](this.state, ...args));
  };

  /**
   * Returns a value from the store's state using a selector function.
   * Used to subscribe to specific parts of the state.
   * This methods causes a rerender whenever the selected state changes.
   *
   * @param key Key of the selector to use.
   */
  useState = <Key extends keyof Selectors>(
    key: Key,
    ...args: SelectorArgs<Selectors[Key]>
  ): Accessor<MaybeAccessorValue<ReturnType<Selectors[Key]>>> => {
    const c = createMemo(() => access(this.selectors![key](this.state, ...args)));
    return c;
  };

  /**
   * Wraps a function with `useStableCallback` to ensure it has a stable reference
   * and assigns it to the context.
   *
   * @param key Key of the event callback. Must be a function in the context.
   * @param fn Function to assign.
   */
  useContextCallback<Key extends ContextFunctionKeys<Context>>(
    key: Key,
    fn: ContextFunction<Context, Key> | undefined,
  ) {
    this.context[key] = fn ?? (NOOP as ContextFunction<Context, Key>);
  }

  /**
   * Returns a stable setter function for a specific key in the store's state.
   * It's commonly used to pass as a ref callback to React elements.
   *
   * @param key Key of the state to set.
   */
  useStateSetter<const Key extends keyof State, Value extends State[Key]>(key: Key) {
    return (value: Value) => this.setState(key as any, value as any);
  }

  /**
   * Observes changes derived from the store's selectors and calls the listener when the selected value changes.
   *
   * @param key Key of the selector to observe.
   * @param listener Listener function called when the selector result changes.
   */
  observe<Key extends keyof Selectors>(
    selector: Key,
    listener: (
      newValue: ReturnType<Selectors[Key]>,
      oldValue: ReturnType<Selectors[Key]>,
      store: this,
    ) => void,
  ): () => void;

  observe<Selector extends ObserveSelector<State>>(
    selector: Selector,
    listener: (newValue: ReturnType<Selector>, oldValue: ReturnType<Selector>, store: this) => void,
  ): () => void;

  observe(
    selector: keyof Selectors | ObserveSelector<State>,
    listener: (newValue: any, oldValue: any, store: this) => void,
  ) {
    let unsubscribe!: () => void;
    createRoot((dispose) => {
      unsubscribe = dispose;

      const data = createMemo(() =>
        typeof selector === 'function'
          ? selector(this.state)
          : this.selectors![selector](this.state),
      );

      createEffect(on(data, (nextValue, prevValue) => listener(nextValue, prevValue, this)));
    });

    return unsubscribe;
  }
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

type SelectorFunction<State> = (state: State, ...args: MaybeAccessor<any>[]) => any;

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;

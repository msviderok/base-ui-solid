import { NOOP } from '@base-ui/utils/empty';
import { createEffect, createMemo, createRoot, on, onCleanup, type Accessor } from 'solid-js';
import type { SetStoreFunction, Store } from 'solid-js/store';
import { createStore } from 'solid-js/store';
import { access, type MaybeAccessor, type MaybeAccessorValue } from '../../solid-helpers';

/**
 * A Store that supports controlled state keys, non-reactive values and provides utility methods for React.
 */
export class SolidStore<
  State extends object,
  Context = Record<string, never>,
  Selectors extends Record<string, SelectorFunction<State>> = Record<string, never>,
> {
  public state: Store<State>;
  public setState: SetStoreFunction<State>;

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
    this.context = context;
    this.selectors = selectors;
  }

  /**
   * Non-reactive values such as refs, callbacks, etc.
   */
  public readonly context: Context;

  /**
   * Keeps track of which properties are controlled.
   */
  private controlledValues: Map<keyof State, boolean> = new Map();

  private selectors: Selectors | undefined;

  /**
   * Synchronizes a single external value into the store.
   *
   * Note that the while the value in `state` is updated immediately, the value returned
   * by `useState` is updated before the next render (similarly to React's `useState`).
   */
  public useSyncedValue<Key extends keyof State, Value extends State[Key]>(
    key: keyof State,
    value: MaybeAccessor<Value>,
  ) {
    createEffect(() => {
      if (this.state[key] !== access(value)) {
        this.set(key, access(value));
      }
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
    value: MaybeAccessor<State[Key]>,
  ) {
    createEffect(() => {
      if (this.state[key] !== access(value)) {
        this.set(key, access(value));
      }

      onCleanup(() => {
        this.set(key, undefined as State[Key]);
      });
    });
  }

  /**
   * Synchronizes multiple external values into the store.
   *
   * Note that the while the values in `state` are updated immediately, the values returned
   * by `useState` are updated before the next render (similarly to React's `useState`).
   */
  public useSyncedValues(statePart: Partial<State>) {
    createEffect(() => {
      this.update(statePart);
    });
  }

  /**
   * Registers a controllable prop pair (`controlled`, `defaultValue`) for a specific key.
   * - If `controlled` is non-undefined, the key is marked as controlled and the store's
   *   state at `key` is updated to match `controlled`. Local writes to that key are ignored.
   * - If `controlled` is undefined, the key is marked as uncontrolled. The store's state
   *   is initialized to `defaultValue` on first render and can be updated with local writes.
   */
  public useControlledProp<Key extends keyof State, Value extends State[Key]>(
    key: keyof State,
    controlled: MaybeAccessor<Value | undefined>,
    defaultValue: MaybeAccessor<Value>,
  ): void {
    const isControlled = () => access(controlled) !== undefined;

    if (process.env.NODE_ENV !== 'production') {
      createEffect(() => {
        const previouslyControlled = this.controlledValues.get(key);
        if (previouslyControlled !== undefined && previouslyControlled !== isControlled()) {
          console.error(
            `A component is changing the ${
              isControlled() ? '' : 'un'
            }controlled state of ${key.toString()} to be ${isControlled() ? 'un' : ''}controlled. Elements should not switch from uncontrolled to controlled (or vice versa).`,
          );
        }
      });
    }

    createEffect(() => {
      if (!this.controlledValues.has(key)) {
        // First time initialization
        this.controlledValues.set(key, isControlled());

        if (!isControlled() && !Object.is(this.state[key], access(defaultValue))) {
          this.setState(key as any, access(defaultValue));
        }
      }
    });

    createEffect(() => {
      if (isControlled() && !Object.is(this.state[key], access(controlled))) {
        // Set the internal state to match the controlled value.
        this.setState(key as any, access(controlled));
      }
    });
  }

  /**
   * Sets a specific key in the store's state to a new value and notifies listeners if the value has changed.
   * If the key is controlled (registered via {@link useControlledProp} with a non-undefined value),
   * the update is ignored and no listeners are notified.
   *
   * @param key The state key to update.
   * @param value The new value to set for the specified key.
   */
  public set<T>(key: keyof State, value: T): void {
    if (this.controlledValues.get(key) === true) {
      // Ignore updates to controlled values
      return;
    }

    this.setState(key as any, value);
  }

  /**
   * Merges the provided changes into the current state and notifies listeners if there are changes.
   * Controlled keys are filtered out and not updated.
   *
   * @param values An object containing the changes to apply to the current state.
   */
  public update(values: Partial<State>): void {
    const newValues = { ...values };
    for (const key in newValues) {
      if (!Object.hasOwn(newValues, key)) {
        continue;
      }

      if (this.controlledValues.get(key) === true) {
        // Ignore updates to controlled values
        delete newValues[key];
        continue;
      }
    }

    this.setState(newValues as State);
  }

  /** Gets the current value from the store using a selector with the provided key.
   *
   * @param key Key of the selector to use.
   */
  public select = ((key: keyof Selectors, ...args: unknown[]) => {
    return access(this.selectors![key](this.state, ...args));
  }) as SolidStoreSelectorMethod<Selectors>;

  /**
   * Returns a value from the store's state using a selector function.
   * Used to subscribe to specific parts of the state.
   * This methods causes a rerender whenever the selected state changes.
   *
   * @param key Key of the selector to use.
   */
  public useState = ((key: keyof Selectors, ...args: unknown[]) => {
    const c = createMemo(() => access(this.selectors![key](this.state, ...args)));
    return c;
  }) as SolidStoreSelectorMethod<Selectors, 'accessor'>;

  /**
   * Wraps a function with `useStableCallback` to ensure it has a stable reference
   * and assigns it to the context.
   *
   * @param key Key of the event callback. Must be a function in the context.
   * @param fn Function to assign.
   */
  public useContextCallback<Key extends ContextFunctionKeys<Context>>(
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
  public useStateSetter<const Key extends keyof State, Value extends State[Key]>(key: keyof State) {
    return (value: Value) => this.set(key, value);
  }

  /**
   * Observes changes derived from the store's selectors and calls the listener when the selected value changes.
   *
   * @param key Key of the selector to observe.
   * @param listener Listener function called when the selector result changes.
   */
  public observe<Key extends keyof Selectors>(
    selector: Key,
    listener: (
      newValue: ReturnType<Selectors[Key]>,
      oldValue: ReturnType<Selectors[Key]>,
      store: this,
    ) => void,
  ): () => void;

  public observe<Selector extends ObserveSelector<State>>(
    selector: Selector,
    listener: (newValue: ReturnType<Selector>, oldValue: ReturnType<Selector>, store: this) => void,
  ): () => void;

  public observe(
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

type SolidStoreSelectorMethod<
  Selectors extends Record<PropertyKey, SelectorFunction<any>>,
  Access extends 'accessor' | 'value' = 'value',
> = <Key extends keyof Selectors>(
  key: Key,
  ...args: SelectorArgs<Selectors[Key]>
) => Access extends 'accessor'
  ? Accessor<MaybeAccessorValue<ReturnType<Selectors[Key]>>>
  : ReturnType<Selectors[Key]>;

type ObserveSelector<State> = (state: State) => any;

type SelectorFunction<State> = (state: State, ...args: any[]) => any;

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;

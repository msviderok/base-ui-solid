import { createEffect, onCleanup, type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { access, type MaybeAccessor } from '../../solid-helpers';
import type { BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import type { PopupTriggerMap } from '../../utils/popups';
import type { FloatingUIOpenChangeDetails } from '../../utils/types';
import type { ContextData, FloatingEvents, ReferenceType } from '../types';
import { createEventEmitter } from '../utils/createEventEmitter';
import { isClickLikeEvent } from '../utils/event';

export interface FloatingRootState {
  open: boolean;
  domReferenceElement: Element | null | undefined;
  referenceElement: ReferenceType | null | undefined;
  floatingElement: HTMLElement | null | undefined;
  positionReference: ReferenceType | null | undefined;
  /** The ID of the floating element. */
  floatingId: string | undefined;
}

export interface FloatingRootStoreContext {
  onOpenChange:
    | ((open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void)
    | undefined;
  readonly dataRef: ContextData;
  readonly events: FloatingEvents;
  nested: boolean;
  noEmit: boolean;
  readonly triggerElements: PopupTriggerMap;
}

interface FloatingRootStoreOptions {
  open: MaybeAccessor<boolean>;
  referenceElement: MaybeAccessor<ReferenceType | null | undefined>;
  floatingElement: MaybeAccessor<HTMLElement | null | undefined>;
  floatingId: MaybeAccessor<string | undefined>;
  /** Non-reactive */
  triggerElements: PopupTriggerMap;
  /** Non-reactive */
  nested: boolean;
  /** Non-reactive */
  noEmit: boolean;
  onOpenChange:
    | ((open: boolean, eventDetails: BaseUIChangeEventDetails<string>) => void)
    | undefined;
}

export class FloatingRootStore {
  public state: Store<FloatingRootState>;
  private setState: SetStoreFunction<FloatingRootState>;
  /**
   * Non-reactive values such as refs, callbacks, etc.
   */
  public readonly context: FloatingRootStoreContext;
  /**
   * Keeps track of which properties are controlled.
   */
  private controlledValues: Map<keyof FloatingRootState, boolean> = new Map();

  constructor(options: FloatingRootStoreOptions) {
    const [internalState, setInternalState] = createStore<FloatingRootState>({
      open: access(options.open),
      referenceElement: access(options.referenceElement),
      floatingElement: access(options.floatingElement),
      floatingId: access(options.floatingId),
      positionReference: access(options.referenceElement),
      domReferenceElement: access(options.referenceElement) as Element | null | undefined,
    });

    // eslint-disable-next-line solid/reactivity
    this.state = internalState;
    this.setState = setInternalState;
    this.context = {
      onOpenChange: options.onOpenChange,
      dataRef: {},
      events: createEventEmitter(),
      nested: options.nested,
      noEmit: options.noEmit,
      triggerElements: options.triggerElements,
    };
  }

  /**
   * Emits the `openchange` event through the internal event emitter and calls the `onOpenChange` handler with the provided arguments.
   *
   * @param newOpen The new open state.
   * @param eventDetails Details about the event that triggered the open state change.
   */
  setOpen = (newOpen: boolean, eventDetails: BaseUIChangeEventDetails<string>) => {
    if (
      !newOpen ||
      !this.state.open ||
      // Prevent a pending hover-open from overwriting a click-open event, while allowing
      // click events to upgrade a hover-open.
      isClickLikeEvent(eventDetails.event)
    ) {
      this.context.dataRef.openEvent = newOpen ? eventDetails.event : undefined;
    }
    if (!this.context.noEmit) {
      const details: FloatingUIOpenChangeDetails = {
        open: newOpen,
        reason: eventDetails.reason,
        nativeEvent: eventDetails.event,
        nested: this.context.nested,
        triggerElement: eventDetails.trigger,
      };

      this.context.events.emit('openchange', details);
    }

    this.context.onOpenChange?.(newOpen, eventDetails);
  };

  /**
   * Synchronizes a single external value into the store.
   *
   * Note that the while the value in `state` is updated immediately, the value returned
   * by `useState` is updated before the next render (similarly to React's `useState`).
   */
  public useSyncedValue<Key extends keyof FloatingRootState, Value extends FloatingRootState[Key]>(
    key: keyof FloatingRootState,
    value: Value,
  ) {
    createEffect(() => {
      if (this.state[key] !== value) {
        this.set(key, value);
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
  public useSyncedValueWithCleanup<Key extends KeysAllowingUndefined<FloatingRootState>>(
    key: Key,
    value: FloatingRootState[Key],
  ) {
    createEffect(() => {
      if (this.state[key] !== value) {
        this.set(key, value);
      }

      onCleanup(() => this.set(key, undefined as FloatingRootState[Key]));
    });
  }

  public select = <T extends keyof FloatingRootState>(key: T): FloatingRootState[T] => {
    return this.state[key];
  };

  public useState = <T extends keyof FloatingRootState>(key: T): Accessor<FloatingRootState[T]> => {
    return () => this.state[key];
  };

  /**
   * Sets a specific key in the store's state to a new value and notifies listeners if the value has changed.
   * If the key is controlled (registered via {@link useControlledProp} with a non-undefined value),
   * the update is ignored and no listeners are notified.
   *
   * @param key The state key to update.
   * @param value The new value to set for the specified key.
   */
  public set<T>(key: keyof FloatingRootState, value: T): void {
    if (this.controlledValues.get(key) === true) {
      // Ignore updates to controlled values
      return;
    }

    if (!Object.is(this.state[key], value)) {
      this.setState({ [key]: value });
    }
  }

  /**
   * Merges the provided changes into the current state and notifies listeners if there are changes.
   * Controlled keys are filtered out and not updated.
   *
   * @param values An object containing the changes to apply to the current state.
   */
  public update(values: Partial<FloatingRootState>): void {
    const newValues = { ...values };
    for (const key in newValues) {
      if (!Object.hasOwn(newValues, key)) {
        continue;
      }

      if (this.controlledValues.get(key as keyof FloatingRootState) === true) {
        // Ignore updates to controlled values
        delete newValues[key as keyof FloatingRootState];
        continue;
      }
    }

    this.setState(newValues);
  }
}

type KeysAllowingUndefined<State> = {
  [Key in keyof State]-?: undefined extends State[Key] ? Key : never;
}[keyof State];

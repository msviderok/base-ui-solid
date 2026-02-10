import {
  batch,
  createContext,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
import {
  BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { useTimeout, type Timeout } from '../../utils/useTimeout';
import { getDelay } from '../hooks/useHover';
import type { Delay, FloatingContext, FloatingRootContext } from '../types';

type CurrentContextRef = {
  onOpenChange: (open: boolean, eventDetails: BaseUIChangeEventDetails<any>) => void;
  setIsInstantPhase: (value: boolean) => void;
} | null;

interface ContextValue {
  hasProvider: Accessor<boolean>;
  setHasProvider: (value: boolean) => void;
  timeoutMs: Accessor<number>;
  setTimeoutMs: (value: number) => void;
  delayRef: Accessor<Delay>;
  setDelayRef: (value: Delay) => void;
  initialDelayRef: Delay;
  timeout: Timeout;
  currentIdRef: Accessor<any>;
  setCurrentIdRef: (value: any) => void;
  currentContextRef: Accessor<CurrentContextRef>;
  setCurrentContextRef: (value: CurrentContextRef) => void;
}

const FloatingDelayGroupContext = createContext<ContextValue>({
  hasProvider: () => false,
  setHasProvider: () => {},
  timeoutMs: () => 0,
  setTimeoutMs: () => {},
  delayRef: () => 0,
  setDelayRef: () => {},
  currentIdRef: () => null,
  setCurrentIdRef: () => {},
  initialDelayRef: 0,
  timeout: useTimeout(),
  currentContextRef: () => null,
  setCurrentContextRef: () => {},
});

export interface FloatingDelayGroupProps {
  children?: JSX.Element;
  /**
   * The delay to use for the group when it's not in the instant phase.
   */
  delay: Delay;
  /**
   * An optional explicit timeout to use for the group, which represents when
   * grouping logic will no longer be active after the close delay completes.
   * This is useful if you want grouping to “last” longer than the close delay,
   * for example if there is no close delay at all.
   */
  timeoutMs?: number;
}

/**
 * Experimental next version of `FloatingDelayGroup` to become the default
 * in the future. This component is not yet stable.
 * Provides context for a group of floating elements that should share a
 * `delay`. Unlike `FloatingDelayGroup`, `useDelayGroup` with this
 * component does not cause a re-render of unrelated consumers of the
 * context when the delay changes.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 * @internal
 */
export function FloatingDelayGroup(props: FloatingDelayGroupProps): JSX.Element {
  // eslint-disable-next-line solid/reactivity
  const initialDelayRef = props.delay;
  const [hasProvider, setHasProvider] = createSignal(true);
  // eslint-disable-next-line solid/reactivity
  const [timeoutMs, setTimeoutMs] = createSignal(props.timeoutMs ?? 0);
  const [delayRef, setDelayRef] = createSignal(initialDelayRef);
  const [currentIdRef, setCurrentIdRef] = createSignal<any>(null);
  const [currentContextRef, setCurrentContextRef] = createSignal<CurrentContextRef>(null);
  const timeout = useTimeout();

  return (
    <FloatingDelayGroupContext.Provider
      value={{
        hasProvider,
        setHasProvider,
        timeoutMs,
        setTimeoutMs,
        delayRef,
        setDelayRef,
        currentIdRef,
        setCurrentIdRef,
        initialDelayRef,
        timeout,
        currentContextRef,
        setCurrentContextRef,
      }}
    >
      {props.children}
    </FloatingDelayGroupContext.Provider>
  );
}

interface UseDelayGroupOptions {
  /**
   * Whether delay grouping should be enabled.
   * @default true
   */
  enabled?: MaybeAccessor<boolean>;
  /**
   * Whether the trigger this hook is used in has opened the tooltip.
   */
  open: MaybeAccessor<boolean>;
}

interface UseDelayGroupReturn {
  /**
   * The delay reference object.
   */
  delayRef: Accessor<Delay>;
  /**
   * Whether animations should be removed.
   */
  isInstantPhase: Accessor<boolean>;
  /**
   * Whether a `<FloatingDelayGroup>` provider is present.
   */
  hasProvider: Accessor<boolean>;
}

/**
 * Enables grouping when called inside a component that's a child of a
 * `FloatingDelayGroup`.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 * @internal
 */
export function useDelayGroup(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  optionsProp: MaybeAccessor<UseDelayGroupOptions>,
): UseDelayGroupReturn {
  const context = () => access(contextProp);
  const options = mergeProps({ open: false }, optionsProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const floatingId = () => store().state.floatingId;
  const enabled = () => access(options.enabled) ?? true;
  const open = () => access(options.open);

  const {
    currentIdRef,
    setCurrentIdRef,
    currentContextRef,
    setCurrentContextRef,
    setDelayRef,
    delayRef,
    timeoutMs,
    initialDelayRef,
    hasProvider,
    timeout,
  } = useContext(FloatingDelayGroupContext);

  const [isInstantPhase, setIsInstantPhase] = createSignal(false);

  function unset() {
    batch(() => {
      setIsInstantPhase(false);
      currentContextRef()?.setIsInstantPhase(false);
      setCurrentIdRef(null);
      setCurrentContextRef(null);
      setDelayRef(initialDelayRef);
    });
  }

  createEffect(() => {
    if (!enabled()) {
      return;
    }
    if (!currentIdRef()) {
      return;
    }

    if (!open() && currentIdRef() === floatingId()) {
      setIsInstantPhase(false);

      if (timeoutMs()) {
        const closingId = floatingId();
        timeout.start(timeoutMs(), () => {
          // If another tooltip has taken over the group, skip resetting.
          if (store().state.open || (currentIdRef() && currentIdRef() !== closingId)) {
            return;
          }
          unset();
        });

        onCleanup(() => timeout.clear());
        return;
      }

      unset();
    }
  });

  createEffect(() => {
    if (!enabled()) {
      return;
    }
    if (!open()) {
      return;
    }

    const prevContext = currentContextRef();
    const prevId = currentIdRef();

    // A new tooltip is opening, so cancel any pending timeout that would reset
    // the group's delay back to the initial value.
    timeout.clear();
    setCurrentContextRef({ onOpenChange: store().setOpen, setIsInstantPhase });
    setCurrentIdRef(floatingId());
    setDelayRef({
      open: 0,
      close: getDelay(initialDelayRef, 'close'),
    });

    if (prevId !== null && prevId !== floatingId()) {
      setIsInstantPhase(true);
      prevContext?.setIsInstantPhase(true);
      prevContext?.onOpenChange(false, createChangeEventDetails(REASONS.none));
    } else {
      setIsInstantPhase(false);
      prevContext?.setIsInstantPhase(false);
    }
  });

  onCleanup(() => {
    setCurrentContextRef(null);
  });

  return {
    hasProvider,
    delayRef,
    isInstantPhase,
  };
}

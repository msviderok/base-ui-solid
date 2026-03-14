import {
  batch,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import { defaultProps, useRef, type ReactLikeRef } from '../../solid-helpers';
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
  hasProvider: boolean;
  timeoutMs: Accessor<number>;
  setTimeoutMs: (value: number) => void;
  delayRef: ReactLikeRef<Delay>;
  initialDelayRef: ReactLikeRef<Delay>;
  timeout: Timeout;
  currentIdRef: ReactLikeRef<any>;
  currentContextRef: ReactLikeRef<CurrentContextRef>;
}

const FloatingDelayGroupContext = createContext<ContextValue>({
  hasProvider: false,
  timeoutMs: () => 0,
  setTimeoutMs: () => {},
  delayRef: { current: 0 },
  currentIdRef: { current: null },
  initialDelayRef: { current: 0 },
  timeout: {} as any,
  currentContextRef: { current: null },
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
  timeoutMs?: number | undefined;
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
export function FloatingDelayGroup(componentProps: FloatingDelayGroupProps): JSX.Element {
  const props = defaultProps(componentProps, { timeoutMs: 0 });
  const initialDelay = () => props.delay;

  const delayRef = useRef(initialDelay());
  const initialDelayRef = useRef(initialDelay());
  const currentIdRef = useRef<string | null>(null);
  const currentContextRef = useRef(null);
  const timeout = useTimeout();
  const [timeoutMs, setTimeoutMs] = createSignal(props.timeoutMs);

  return (
    <FloatingDelayGroupContext.Provider
      value={{
        hasProvider: true,
        timeoutMs,
        setTimeoutMs,
        delayRef,
        currentIdRef,
        initialDelayRef,
        timeout,
        currentContextRef,
      }}
    >
      {props.children}
    </FloatingDelayGroupContext.Provider>
  );
}

interface UseDelayGroupOptions {
  /**
   * Whether the trigger this hook is used in has opened the tooltip.
   */
  open: boolean;
}

interface UseDelayGroupReturn {
  /**
   * The delay reference object.
   */
  delayRef: ReactLikeRef<Delay>;
  /**
   * Whether animations should be removed.
   */
  isInstantPhase: Accessor<boolean>;
  /**
   * Whether a `<FloatingDelayGroup>` provider is present.
   */
  hasProvider: boolean;
}

/**
 * Enables grouping when called inside a component that's a child of a
 * `FloatingDelayGroup`.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 * @internal
 */
export function useDelayGroup(parameters: {
  context: FloatingRootContext | FloatingContext;
  options: UseDelayGroupOptions;
}): UseDelayGroupReturn {
  const options = defaultProps(parameters.options ?? {}, { open: false });
  const store = () =>
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context;
  const floatingId = () => store().state.floatingId;

  const {
    currentIdRef,
    currentContextRef,
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
      currentContextRef?.current?.setIsInstantPhase(false);
      currentIdRef.current = null;
      currentContextRef.current = null;
      delayRef.current = initialDelayRef?.current;
    });
  }

  createEffect(() => {
    if (!currentIdRef.current) {
      return;
    }

    if (!options.open && currentIdRef.current === floatingId()) {
      setIsInstantPhase(false);

      if (timeoutMs()) {
        const closingId = floatingId();
        const fn = () => {
          // If another tooltip has taken over the group, skip resetting.
          if (store().state.open || (currentIdRef.current && currentIdRef.current !== closingId)) {
            return;
          }
          unset();
        };
        timeout.start(timeoutMs(), fn);
        onCleanup(() => timeout.clear());
        return;
      }

      unset();
    }
  });

  createEffect(() => {
    if (!options.open) {
      return;
    }

    const prevContext = currentContextRef.current;
    const prevId = currentIdRef.current;

    // A new tooltip is opening, so cancel any pending timeout that would reset
    // the group's delay back to the initial value.
    timeout.clear();
    currentContextRef.current = { onOpenChange: store().setOpen, setIsInstantPhase };
    currentIdRef.current = floatingId();
    delayRef.current = {
      open: 0,
      close: getDelay(initialDelayRef.current, 'close'),
    };

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
    currentContextRef.current = null;
  });

  return {
    hasProvider,
    delayRef,
    isInstantPhase,
  };
}

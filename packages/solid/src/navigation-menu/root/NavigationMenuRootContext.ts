import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import type { FloatingRootContext } from '../../floating-ui-solid';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import type { NavigationMenuRoot } from './NavigationMenuRoot';

export interface NavigationMenuRootContext {
  open: Accessor<boolean>;
  value: Accessor<any>;
  setValue: (value: any, eventDetails: NavigationMenuRoot.ChangeEventDetails) => void;
  transitionStatus: Accessor<TransitionStatus>;
  mounted: Accessor<boolean>;
  popupElement: Accessor<HTMLElement | null | undefined>;
  setPopupElement: Setter<HTMLElement | null | undefined>;
  positionerElement: Accessor<HTMLElement | null | undefined>;
  setPositionerElement: Setter<HTMLElement | null | undefined>;
  viewportElement: Accessor<HTMLElement | null | undefined>;
  setViewportElement: Setter<HTMLElement | null | undefined>;
  viewportTargetElement: Accessor<HTMLElement | null | undefined>;
  setViewportTargetElement: Setter<HTMLElement | null | undefined>;
  activationDirection: Accessor<'left' | 'right' | 'up' | 'down' | null>;
  setActivationDirection: Setter<'left' | 'right' | 'up' | 'down' | null>;
  floatingRootContext: Accessor<FloatingRootContext | undefined>;
  setFloatingRootContext: Setter<FloatingRootContext | undefined>;
  refs: {
    currentContentRef: HTMLDivElement | null | undefined;
    rootRef: HTMLDivElement | null | undefined;
    beforeInsideRef: HTMLSpanElement | null | undefined;
    afterInsideRef: HTMLSpanElement | null | undefined;
    beforeOutsideRef: HTMLSpanElement | null | undefined;
    afterOutsideRef: HTMLSpanElement | null | undefined;
    prevTriggerElementRef: Element | null | undefined;
  };
  nested: Accessor<boolean>;
  delay: Accessor<number>;
  closeDelay: Accessor<number>;
  orientation: Accessor<'horizontal' | 'vertical'>;
  viewportInert: Accessor<boolean>;
  setViewportInert: Setter<boolean>;
}

export const NavigationMenuRootContext = createContext<NavigationMenuRootContext>();

function useNavigationMenuRootContext(optional?: false): NavigationMenuRootContext;
function useNavigationMenuRootContext(optional: true): NavigationMenuRootContext | undefined;
function useNavigationMenuRootContext(optional?: boolean) {
  const context = useContext(NavigationMenuRootContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: NavigationMenuRootContext is missing. Navigation Menu parts must be placed within <NavigationMenu.Root>.',
    );
  }
  return context;
}

export const NavigationMenuTreeContext = createContext<Accessor<string | undefined> | undefined>();

function useNavigationMenuTreeContext() {
  return useContext(NavigationMenuTreeContext);
}

export { useNavigationMenuRootContext, useNavigationMenuTreeContext };

import { createContext, useContext, type Accessor } from 'solid-js';
import type { FloatingRootContext } from '../../floating-ui-solid';
import type { BaseUIHTMLProps, HTMLProps } from '../../utils/types';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import type { PreviewCardRoot } from './PreviewCardRoot';

export interface PreviewCardTriggerDelayConfig {
  delay?: number;
  closeDelay?: number;
}

export interface PreviewCardRootContext {
  open: Accessor<boolean>;
  setOpen: (open: boolean, eventDetails: PreviewCardRoot.ChangeEventDetails) => void;
  setTriggerElement: (el: Element | null | undefined) => void;
  positionerElement: Accessor<HTMLElement | null | undefined>;
  setPositionerElement: (el: HTMLElement | null | undefined) => void;
  mounted: Accessor<boolean>;
  setMounted: (mounted: boolean) => void;
  triggerProps: (externalProps: HTMLProps | BaseUIHTMLProps) => BaseUIHTMLProps;
  popupProps: (externalProps: HTMLProps | BaseUIHTMLProps) => BaseUIHTMLProps;
  instantType: Accessor<'dismiss' | 'focus' | undefined>;
  floatingRootContext: FloatingRootContext;
  transitionStatus: Accessor<TransitionStatus>;
  refs: {
    popupRef: HTMLElement | null | undefined;
  };
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
  writeDelayRefs: (config: PreviewCardTriggerDelayConfig) => void;
}

export const PreviewCardRootContext = createContext<PreviewCardRootContext | undefined>(undefined);

export function usePreviewCardRootContext() {
  const context = useContext(PreviewCardRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: PreviewCardRootContext is missing. PreviewCard parts must be placed within <PreviewCard.Root>.',
    );
  }

  return context;
}

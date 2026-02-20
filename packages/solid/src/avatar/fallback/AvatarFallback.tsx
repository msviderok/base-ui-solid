import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { type TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import type { AvatarRoot } from '../root/AvatarRoot';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';

const stateAttributesMapping: StateAttributesMapping<AvatarFallback.State> = {
  ...avatarStateAttributesMapping,
  ...transitionStatusMapping,
};

/**
 * Rendered when the image fails to load or when no image is provided.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarFallback(componentProps: AvatarFallback.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['delay']);

  const { imageLoadingStatus } = useAvatarRootContext();
  const [delayPassed, setDelayPassed] = createSignal(local.delay === undefined);
  const timeout = useTimeout();

  const visible = () => imageLoadingStatus() !== 'loaded' && delayPassed();
  const { mounted, transitionStatus, setMounted } = useTransitionStatus(visible);

  let fallbackRef = null as HTMLSpanElement | null | undefined;

  createEffect(() => {
    if (local.delay !== undefined) {
      timeout.start(local.delay, () => setDelayPassed(true));
    }
    onCleanup(() => {
      timeout.clear();
    });
  });

  const state: AvatarFallback.State = {
    get imageLoadingStatus() {
      return imageLoadingStatus();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  useOpenChangeComplete({
    open: visible,
    ref: () => fallbackRef,
    onComplete() {
      if (!visible()) {
        setMounted(false);
      }
    },
  });

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      fallbackRef = el;
    },
    props: elementProps,
    stateAttributesMapping,
    enabled: mounted,
  });

  return <Show when={mounted()}>{element()}</Show>;
}

export interface AvatarFallbackState extends AvatarRoot.State {
  transitionStatus: TransitionStatus;
}

export interface AvatarFallbackProps extends BaseUIComponentProps<'span', AvatarFallback.State> {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   */
  delay?: number | undefined;
}

export namespace AvatarFallback {
  export type State = AvatarFallbackState;
  export type Props = AvatarFallbackProps;
}

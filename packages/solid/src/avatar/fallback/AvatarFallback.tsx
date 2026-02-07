import { createEffect, createSignal, onCleanup } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import type { AvatarRoot } from '../root/AvatarRoot';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';

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

  createEffect(() => {
    if (local.delay !== undefined) {
      timeout.start(local.delay, () => setDelayPassed(true));
    }
    onCleanup(() => {
      timeout.clear();
    });
  });

  const state: AvatarRoot.State = {
    get imageLoadingStatus() {
      return imageLoadingStatus();
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    props: elementProps,
    enabled: () => imageLoadingStatus() !== 'loaded' && delayPassed(),
    customStyleHookMapping: avatarStateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface AvatarFallbackProps extends BaseUIComponentProps<'span', AvatarRoot.State> {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   */
  delay?: number;
}

export namespace AvatarFallback {
  export type Props = AvatarFallbackProps;
}

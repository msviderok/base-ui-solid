import { batch, createEffect } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { AvatarRoot } from '../root/AvatarRoot';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { ImageLoadingStatus, useImageLoadingStatus } from './useImageLoadingStatus';

/**
 * The image to be displayed in the avatar.
 * Renders an `<img>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui.com/react/components/avatar)
 */
export function AvatarImage(componentProps: AvatarImage.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'onLoadingStatusChange',
    'referrerPolicy',
    'crossOrigin',
  ]);

  const context = useAvatarRootContext();
  const imageLoadingStatus = useImageLoadingStatus({
    src: () => componentProps.src,
    referrerPolicy: local.referrerPolicy,
    crossOrigin: local.crossOrigin,
  });

  const handleLoadingStatusChange = (status: ImageLoadingStatus) => {
    batch(() => {
      local.onLoadingStatusChange?.(status);
      context.setImageLoadingStatus(status);
    });
  };

  createEffect(() => {
    if (imageLoadingStatus() !== 'idle') {
      handleLoadingStatusChange(imageLoadingStatus());
    }
  });

  const state: AvatarRoot.State = {
    get imageLoadingStatus() {
      return imageLoadingStatus();
    },
  };

  const element = useRenderElement('img', componentProps, {
    state,
    props: elementProps,
    customStyleHookMapping: avatarStateAttributesMapping,
    enabled: () => imageLoadingStatus() === 'loaded',
  });

  return <>{element()}</>;
}

export interface AvatarImageProps extends BaseUIComponentProps<'img', AvatarRoot.State> {
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
}

export namespace AvatarImage {
  export type Props = AvatarImageProps;
}

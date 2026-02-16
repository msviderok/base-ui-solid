import { onCleanup, onMount } from 'solid-js';
import { type MaybeAccessor, access } from '../solid-helpers';

export const STYLE_TAG_ID = 'disable-scrollbar';
const DISABLE_SCROLLBAR_CLASS_NAME = 'base-ui-disable-scrollbar';

export const styleDisableScrollbar = {
  class: DISABLE_SCROLLBAR_CLASS_NAME,
  getElement(nonce?: string) {
    const style = document.createElement('style');

    style.id = STYLE_TAG_ID;
    style.textContent = `.${DISABLE_SCROLLBAR_CLASS_NAME}{scrollbar-width:none}.${DISABLE_SCROLLBAR_CLASS_NAME}::-webkit-scrollbar{display:none}`;

    (style as any).href = DISABLE_SCROLLBAR_CLASS_NAME;
    (style as any).precedence = 'base-ui:low';
    if (nonce) {
      style.nonce = nonce;
    }

    return style;
  },
};

export const useStyleDisableScrollbar = (nonce?: MaybeAccessor<string | undefined>) => {
  onMount(() => {
    if (!document.head.getElementsByTagName('style').namedItem(STYLE_TAG_ID)) {
      const el = styleDisableScrollbar.getElement(access(nonce));
      document.head.appendChild(el);
      onCleanup(() => {
        if (document.head.getElementsByTagName('style').namedItem(STYLE_TAG_ID)) {
          document.head.removeChild(el);
        }
      });
    }
  });
};

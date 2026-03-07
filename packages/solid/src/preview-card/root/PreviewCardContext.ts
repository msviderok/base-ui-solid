import { createContext, useContext } from 'solid-js';
import { PreviewCardStore } from '../store/PreviewCardStore';

export type PreviewCardRootContext<Payload = unknown> = {
  store: PreviewCardStore<Payload>;
};

export const PreviewCardRootContext = createContext<Partial<PreviewCardRootContext>>({
  store: undefined,
});

export function usePreviewCardRootContext(optional?: false): PreviewCardRootContext;
export function usePreviewCardRootContext(optional: true): Partial<PreviewCardRootContext>;
export function usePreviewCardRootContext(optional?: boolean) {
  const context = useContext(PreviewCardRootContext);
  if (context.store === undefined && !optional) {
    throw new Error(
      'Base UI: PreviewCardRootContext is missing. PreviewCard parts must be placed within <PreviewCard.Root>.',
    );
  }

  return context;
}

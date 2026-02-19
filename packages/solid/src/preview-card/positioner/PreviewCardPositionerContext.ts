import { createContext, useContext, type Accessor, type JSX } from 'solid-js';
import type { Align, Side } from '../../utils/useAnchorPositioning';

export interface PreviewCardPositionerContext {
  side: Accessor<Side>;
  align: Accessor<Align>;
  refs: {
    arrowRef: (Element | null) | undefined;
  };
  arrowUncentered: Accessor<boolean>;
  arrowStyles: JSX.CSSProperties;
}

export const PreviewCardPositionerContext = createContext<PreviewCardPositionerContext>();

export function usePreviewCardPositionerContext() {
  const context = useContext(PreviewCardPositionerContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: <PreviewCard.Popup> and <PreviewCard.Arrow> must be used within the <PreviewCard.Positioner> component',
    );
  }

  return context;
}

import { type Accessor, createContext, useContext } from 'solid-js';

export type TextDirection = 'ltr' | 'rtl';

export type DirectionContext = {
  direction: Accessor<TextDirection>;
};

/**
 * @internal
 */
export const DirectionContext = createContext<DirectionContext>();

export function useDirection() {
  const context = useContext(DirectionContext);
  return () => context?.direction() ?? 'ltr';
}

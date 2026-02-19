import { createContext, useContext, type Accessor } from 'solid-js';
import type { SwipeDirection } from '../../utils/useSwipeDismiss';
import type { DrawerRootSnapPointChangeEventDetails } from './DrawerRoot';

export type DrawerSwipeDirection = SwipeDirection;
export type DrawerSnapPoint = number | string;

export interface DrawerRootContext {
  swipeDirection: Accessor<DrawerSwipeDirection>;
  /**
   * Whether snap points can be skipped based on swipe velocity.
   */
  snapToSequentialPoints: Accessor<boolean>;
  /**
   * Snap points used to size/position the drawer.
   */
  snapPoints?: Accessor<DrawerSnapPoint[] | undefined>;
  /**
   * The currently active snap point.
   */
  activeSnapPoint?: Accessor<DrawerSnapPoint | null | undefined>;
  /**
   * Updates the currently active snap point.
   */
  setActiveSnapPoint?:
    | ((
        snapPoint: DrawerSnapPoint | null,
        eventDetails?: DrawerRootSnapPointChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * The measured height of the frontmost open drawer within the current nested drawer stack.
   */
  frontmostHeight: Accessor<number>;
  /**
   * The measured height of the drawer popup element.
   */
  popupHeight: Accessor<number>;
  /**
   * Whether the current drawer has a nested drawer mounted in its stack (including while it is
   * transitioning out).
   */
  hasNestedDrawer: Accessor<boolean>;
  /**
   * Whether a nested drawer is currently being swiped.
   */
  nestedSwiping: Accessor<boolean>;
  /**
   * Provides nested swipe progress without re-rendering the drawer tree.
   */
  nestedSwipeProgress: Accessor<number>;
  setNestedSwipeProgress: (progress: number) => void;
  /**
   * Called by a nested drawer to report whether it is still present (open or transitioning out).
   */
  onNestedDrawerPresenceChange: (present: boolean) => void;
  /**
   * Called by the drawer popup to report its own measured height.
   */
  onPopupHeightChange: (height: number) => void;
  /**
   * Called by a nested drawer to report the frontmost height of its own stack.
   */
  onNestedFrontmostHeightChange: (height: number) => void;
  /**
   * Called by a nested drawer to report whether it's being swiped.
   */
  onNestedSwipingChange: (swiping: boolean) => void;
  /**
   * Called by a nested drawer to report its swipe progress.
   */
  onNestedSwipeProgressChange: (progress: number) => void;
  /**
   * Provided to nested drawers so they can report their frontmost height to the parent drawer.
   */
  notifyParentFrontmostHeight?: ((height: number) => void) | undefined;
  /**
   * Provided to nested drawers so they can report swiping to the parent drawer.
   */
  notifyParentSwipingChange?: ((swiping: boolean) => void) | undefined;
  /**
   * Provided to nested drawers so they can report swipe progress to the parent drawer.
   */
  notifyParentSwipeProgressChange?: ((progress: number) => void) | undefined;
  /**
   * Provided to nested drawers so they can report whether they are still present (open or
   * transitioning out) to the parent drawer.
   */
  notifyParentHasNestedDrawer?: ((present: boolean) => void) | undefined;
}

export const DrawerRootContext = createContext<DrawerRootContext | undefined>(undefined);

export function useDrawerRootContext(optional?: false): DrawerRootContext;
export function useDrawerRootContext(optional: true): DrawerRootContext | undefined;
export function useDrawerRootContext(optional?: boolean) {
  const drawerRootContext = useContext(DrawerRootContext);

  if (optional === false && drawerRootContext === undefined) {
    throw new Error(
      'Base UI: DrawerRootContext is missing. Drawer parts must be placed within <Drawer.Root>.',
    );
  }

  return drawerRootContext;
}

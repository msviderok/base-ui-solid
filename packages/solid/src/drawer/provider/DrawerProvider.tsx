import { type JSX } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { DrawerProviderContext, type DrawerVisualState } from './DrawerProviderContext';

/**
 * Provides a shared context for coordinating global Drawer UI,
 * such as indent/background effects based on whether any Drawer is open.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export function DrawerProvider(props: DrawerProvider.Props) {
  const [openById, setOpenById] = createStore<{
    drawers: Record<string, boolean>;
    active: boolean;
  }>({
    drawers: {},
    get active() {
      return Object.values(this.drawers).some(Boolean);
    },
  });
  const [visualStateStore, setVisualState] = createVisualStateStore();

  function setDrawerOpen(drawerId: string, open: boolean) {
    setOpenById('drawers', drawerId, open);
  }

  const removeDrawer = (drawerId: string) => {
    setOpenById(
      produce((prev) => {
        delete prev.drawers[drawerId];
      }),
    );
  };

  const contextValue = {
    setDrawerOpen,
    removeDrawer,
    active: () => openById.active,
    visualStateStore,
    setVisualState,
  };

  return (
    <DrawerProviderContext.Provider value={contextValue}>
      {props.children}
    </DrawerProviderContext.Provider>
  );
}

export interface DrawerProviderState {}

export interface DrawerProviderProps {
  children?: JSX.Element;
}

export namespace DrawerProvider {
  export type State = DrawerProviderState;
  export type Props = DrawerProviderProps;
}

function createVisualStateStore() {
  const [state, setState] = createStore<DrawerVisualState>({
    swipeProgress: 0,
    frontmostHeight: 0,
  });

  function set(nextState: Partial<DrawerVisualState>) {
    setState(
      produce((currentState) => {
        if (nextState.swipeProgress !== undefined) {
          currentState.swipeProgress = Number.isFinite(nextState.swipeProgress)
            ? nextState.swipeProgress
            : 0;
        }

        if (nextState.frontmostHeight !== undefined) {
          currentState.frontmostHeight = Number.isFinite(nextState.frontmostHeight)
            ? nextState.frontmostHeight
            : 0;
        }
      }),
    );
  }

  return [state, set] as const;
}

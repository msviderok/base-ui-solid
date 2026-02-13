import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import { FloatingTreeStore } from '../../floating-ui-solid/components/FloatingTreeStore';
import {
  createInitialPopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreState,
  PopupTriggerMap,
} from '../../utils/popups';
import { SolidStore } from '../../utils/store/SolidStore';
import { HTMLProps } from '../../utils/types';
import { MenuParent, MenuRoot } from '../root/MenuRoot';

export type State<Payload> = PopupStoreState<Payload> & {
  disabled: boolean;
  modal: boolean;
  allowMouseEnter: boolean;
  parent: MenuParent;
  rootId: string | undefined;
  activeIndex: number | null;
  hoverEnabled: boolean;
  stickIfOpen: boolean;
  instantType: 'dismiss' | 'click' | 'group' | undefined;
  openChangeReason: MenuRoot.ChangeEventReason | null;
  floatingTreeRoot: FloatingTreeStore;
  floatingNodeId: string | undefined;
  floatingParentNodeId: string | null;
  itemProps: HTMLProps;
  closeDelay: number;
  keyboardEventRelay: ((event: KeyboardEvent) => void) | undefined;
};

type Context = PopupStoreContext<MenuRoot.ChangeEventDetails> & {
  refs: {
    positionerRef: HTMLElement | null | undefined;
    popupRef: HTMLElement | null | undefined;
    typingRef: boolean;
    itemDomElements: (HTMLElement | null | undefined)[];
    itemLabels: (string | null)[];
    allowMouseUpTriggerRef: boolean;
    triggerFocusTargetRef: HTMLElement | null | undefined;
    beforeContentFocusGuardRef: HTMLElement | null | undefined;
  };
};

const selectors = {
  ...popupStoreSelectors,
  disabled: (state: State<unknown>) =>
    state.parent.type === 'menubar'
      ? state.parent.context.disabled || state.disabled
      : state.disabled,

  modal: (state: State<unknown>) =>
    (state.parent.type === undefined || state.parent.type === 'context-menu') &&
    (state.modal ?? true),

  allowMouseEnter: (state: State<unknown>): boolean =>
    state.parent.type === 'menu'
      ? state.parent.store.select('allowMouseEnter')
      : state.allowMouseEnter,
  stickIfOpen: (state: State<unknown>) => state.stickIfOpen,
  parent: (state: State<unknown>) => state.parent,
  rootId: (state: State<unknown>): string | undefined => {
    if (state.parent.type === 'menu') {
      return state.parent.store.select('rootId');
    }

    return state.parent.type !== undefined ? state.parent.context.rootId() : state.rootId;
  },
  activeIndex: (state: State<unknown>) => state.activeIndex,
  isActive: (state: State<unknown>, itemIndex: number) => state.activeIndex === itemIndex,
  hoverEnabled: (state: State<unknown>) => state.hoverEnabled,
  instantType: (state: State<unknown>) => state.instantType,
  lastOpenChangeReason: (state: State<unknown>) => state.openChangeReason,
  floatingTreeRoot: (state: State<unknown>): FloatingTreeStore => {
    if (state.parent.type === 'menu') {
      return state.parent.store.select('floatingTreeRoot');
    }

    return state.floatingTreeRoot;
  },
  floatingNodeId: (state: State<unknown>) => state.floatingNodeId,
  floatingParentNodeId: (state: State<unknown>) => state.floatingParentNodeId,
  itemProps: (state: State<unknown>) => state.itemProps,
  closeDelay: (state: State<unknown>) => state.closeDelay,
  keyboardEventRelay: (state: State<unknown>): ((event: KeyboardEvent) => void) | undefined => {
    if (state.keyboardEventRelay) {
      return state.keyboardEventRelay;
    }

    if (state.parent.type === 'menu') {
      return state.parent.store.select('keyboardEventRelay');
    }

    return undefined;
  },
};

export class MenuStore<Payload> extends SolidStore<
  Readonly<State<Payload>>,
  Context,
  typeof selectors
> {
  constructor(initialState?: Partial<State<Payload>>) {
    super(
      { ...createInitialState(), ...initialState },
      {
        refs: {
          positionerRef: null,
          popupRef: null,
          typingRef: false,
          itemDomElements: [],
          itemLabels: [],
          allowMouseUpTriggerRef: false,
          triggerFocusTargetRef: null,
          beforeContentFocusGuardRef: null,
        },
        onOpenChangeComplete: undefined,
        triggerElements: new PopupTriggerMap(),
      },
      selectors,
    );

    // Sync `allowMouseEnter` with parent menu if applicable.
    this.observe(
      (state) => state.allowMouseEnter,
      (allowMouseEnter, oldValue) => {
        // The allowMouseEnter !== oldValue check prevent calling parent store's set
        // on intialization. Without it, React might complain about updating one component during rendering another.
        if (this.state.parent.type === 'menu' && allowMouseEnter !== oldValue) {
          this.state.parent.store.set('allowMouseEnter', allowMouseEnter);
        }
      },
    );

    // Set up propagation of state from parent menu if applicable.
    this.unsubscribeParentListener = this.observe('parent', (parent) => {
      this.unsubscribeParentListener?.();

      if (parent.type === 'menu') {
        this.unsubscribeParentListener = parent.store.subscribe(() => {
          this.notifyAll();
        });

        this.context.refs.allowMouseUpTriggerRef = parent.store.context.allowMouseUpTriggerRef;
        return;
      }

      if (parent.type !== undefined) {
        this.context.refs.allowMouseUpTriggerRef = parent.context.refs.allowMouseUpTriggerRef;
      }

      this.unsubscribeParentListener = null;
    });
  }

  setOpen(open: boolean, eventDetails: Omit<MenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>) {
    this.state.floatingRootContext.context.events.emit('setOpen', { open, eventDetails });
  }

  public static useStore<Payload>(
    externalStore: MenuStore<Payload> | undefined,
    initialState: Partial<State<Payload>>,
  ) {
    const store = externalStore ?? new MenuStore<Payload>(initialState);

    return store;
  }

  private unsubscribeParentListener: (() => void) | null = null;
}

function createInitialState<Payload>(): State<Payload> {
  return {
    ...createInitialPopupStoreState(),
    disabled: false,
    modal: true,
    allowMouseEnter: true,
    stickIfOpen: true,
    parent: {
      type: undefined,
    },
    rootId: undefined,
    activeIndex: null,
    hoverEnabled: true,
    instantType: undefined,
    openChangeReason: null,
    floatingTreeRoot: new FloatingTreeStore(),
    floatingNodeId: undefined,
    floatingParentNodeId: null,
    itemProps: EMPTY_OBJECT as HTMLProps,
    keyboardEventRelay: undefined,
    closeDelay: 0,
  };
}

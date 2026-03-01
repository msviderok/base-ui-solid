import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import { type Accessor, mergeProps as solidMergeProps } from 'solid-js';
import { FloatingTreeStore } from '../../floating-ui-solid/components/FloatingTreeStore';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import type { ReactLikeRef } from '../../solid-helpers';
import {
  createInitialPopupStoreState,
  PopupStoreContext,
  popupStoreSelectors,
  PopupStoreState,
  PopupTriggerMap,
} from '../../utils/popups';
import { SolidStore } from '../../utils/store/SolidStoreV2';
import { HTMLProps } from '../../utils/types';
import { MenuParent, MenuRoot } from '../root/MenuRoot';

export type State<Payload> = PopupStoreState<Payload> & {
  disabled: boolean;
  modal: boolean;
  allowMouseEnter: boolean;
  rootId: string | undefined;
  activeIndex: number | null;
  hoverEnabled: boolean;
  stickIfOpen: boolean;
  instantType: 'dismiss' | 'click' | 'group' | undefined;
  openChangeReason: MenuRoot.ChangeEventReason | null;
  floatingNodeId: string | undefined;
  floatingParentNodeId: string | null;
  itemProps: HTMLProps;
  closeDelay: number;
  keyboardEventRelay: ((event: KeyboardEvent) => void) | undefined;
  readonly context: Context;
};

type Context = PopupStoreContext<MenuRoot.ChangeEventDetails> & {
  readonly positionerRef: ReactLikeRef<HTMLElement | null | undefined>;
  readonly popupRef: ReactLikeRef<HTMLElement | null | undefined>;
  readonly typingRef: ReactLikeRef<boolean>;
  readonly itemDomElements: ReactLikeRef<(HTMLElement | null | undefined)[]>;
  readonly itemLabels: ReactLikeRef<(string | null)[]>;
  allowMouseUpTriggerRef: ReactLikeRef<boolean>;
  readonly triggerFocusTargetRef: ReactLikeRef<HTMLElement | null | undefined>;
  readonly beforeContentFocusGuardRef: ReactLikeRef<HTMLElement | null | undefined>;
  hasExplicitFinalFocus: boolean;
  parent: MenuParent;
  floatingTreeRoot: FloatingTreeStore;
};

const selectors = {
  ...popupStoreSelectors,
  disabled: (state: State<unknown>) =>
    state.context.parent.type === 'menubar'
      ? state.context.parent.context.disabled || state.disabled
      : state.disabled,

  modal: (state: State<unknown>) =>
    (state.context.parent.type === undefined || state.context.parent.type === 'context-menu') &&
    (state.modal ?? true),

  allowMouseEnter: (state: State<unknown>) => state.allowMouseEnter,
  stickIfOpen: (state: State<unknown>) => state.stickIfOpen,
  parent: (state: State<unknown>) => state.context.parent,
  rootId: (state: State<unknown>): string | undefined => {
    if (state.context.parent.type === 'menu') {
      return state.context.parent.store.select('rootId');
    }

    return state.context.parent.type !== undefined
      ? state.context.parent.context.rootId()
      : state.rootId;
  },
  activeIndex: (state: State<unknown>) => state.activeIndex,
  isActive: (state: State<unknown>, itemIndex: Accessor<number>) =>
    state.activeIndex === itemIndex(),
  hoverEnabled: (state: State<unknown>) => state.hoverEnabled,
  instantType: (state: State<unknown>) => state.instantType,
  lastOpenChangeReason: (state: State<unknown>) => state.openChangeReason,
  floatingTreeRoot: (state: State<unknown>): FloatingTreeStore => {
    if (state.context.parent.type === 'menu') {
      return state.context.parent.store.select('floatingTreeRoot');
    }

    return state.context.floatingTreeRoot;
  },
  floatingNodeId: (state: State<unknown>) => state.floatingNodeId,
  floatingParentNodeId: (state: State<unknown>) => state.floatingParentNodeId,
  itemProps: (state: State<unknown>) => state.itemProps,
  closeDelay: (state: State<unknown>) => state.closeDelay,
  keyboardEventRelay: (state: State<unknown>): ((event: KeyboardEvent) => void) | undefined => {
    if (state.keyboardEventRelay) {
      return state.keyboardEventRelay;
    }

    if (state.context.parent.type === 'menu') {
      return state.context.parent.store.select('keyboardEventRelay');
    }

    return undefined;
  },
};

export function MenuStore<Payload>(
  initialState?: Partial<State<Payload>>,
  initialContext?: Partial<Context>,
) {
  const ctx: Context = {
    positionerRef: { current: null },
    popupRef: { current: null },
    typingRef: { current: false },
    itemDomElements: { current: [] },
    itemLabels: { current: [] },
    allowMouseUpTriggerRef: { current: false },
    triggerFocusTargetRef: { current: null },
    beforeContentFocusGuardRef: { current: null },
    hasExplicitFinalFocus: false,
    onOpenChangeComplete: undefined,
    triggerElements: new PopupTriggerMap(),
    floatingRootContext: getEmptyRootContext(),
    parent: { type: undefined },
    floatingTreeRoot: new FloatingTreeStore(),
    ...initialContext,
  };

  if (ctx.parent.type === 'menu') {
    ctx.allowMouseUpTriggerRef = ctx.parent.store.context.allowMouseUpTriggerRef;
  } else if (ctx.parent.type !== undefined) {
    ctx.allowMouseUpTriggerRef = ctx.parent.context.allowMouseUpTriggerRef;
  }

  const [state, setState] = createInitialState(initialState, ctx);
  const store = SolidStore<State<Payload>, Context, typeof selectors>(
    [state, setState],
    ctx,
    selectors,
  );

  function setOpen(
    open: boolean,
    eventDetails: Omit<MenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) {
    store.context.floatingRootContext.context.events.emit('setOpen', { open, eventDetails });
  }

  const merged = solidMergeProps(store, { setOpen });
  return merged;
}

function createInitialState<Payload>(
  initialState?: Partial<State<Payload>>,
  initialContext?: Context,
) {
  return createInitialPopupStoreState<Payload, State<Payload>>({
    disabled: false,
    modal: true,
    allowMouseEnter: false,
    stickIfOpen: true,

    rootId: undefined,
    activeIndex: null,
    hoverEnabled: true,
    instantType: undefined,
    openChangeReason: null,
    floatingNodeId: undefined,
    floatingParentNodeId: null,
    itemProps: EMPTY_OBJECT as HTMLProps,
    keyboardEventRelay: undefined,
    closeDelay: 0,
    get context() {
      return initialContext as Context;
    },
    ...initialState,
  });
}

MenuStore.useStore = <_Payload>(
  externalStore: MenuStore<_Payload> | undefined,
  _initialState: Partial<State<_Payload>>,
): MenuStore<_Payload> => {
  return externalStore ?? MenuStore<_Payload>(_initialState);
};

export type MenuStore<Payload> = ReturnType<typeof MenuStore<Payload>>;

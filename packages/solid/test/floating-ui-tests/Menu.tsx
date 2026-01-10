import c from 'clsx';
import {
  createContext,
  createEffect,
  createSignal,
  on,
  onCleanup,
  Show,
  splitProps,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import { CompositeList } from '../../src/composite/list/CompositeList';
import { useCompositeListItem } from '../../src/composite/list/useCompositeListItem';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useFocus,
  useHover,
  useInteractions,
  useListNavigation,
  useRole,
  useTypeahead,
} from '../../src/floating-ui-solid';
import { callEventHandler } from '../../src/solid-helpers';

type MenuContextType = {
  getItemProps: ReturnType<typeof useInteractions>['getItemProps'];
  activeIndex: Accessor<number | null>;
  setActiveIndex: (value: number | null) => void;
  setHasFocusInside: (value: boolean) => void;
  allowHover: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  setIsOpen: (value: boolean) => void;
  parent: MenuContextType | null;
};

const MenuContext = createContext<MenuContextType>({
  getItemProps: () => ({}),
  activeIndex: () => null,
  setActiveIndex: () => {},
  setHasFocusInside: () => {},
  allowHover: () => true,
  isOpen: () => false,
  setIsOpen: () => {},
  parent: null,
});

interface MenuProps {
  label: string;
  nested?: boolean;
  children?: JSX.Element;
  keepMounted?: boolean;
  orientation?: 'vertical' | 'horizontal' | 'both';
  cols?: number;
  openOnFocus?: boolean;
}

/** @internal */
export function MenuComponent(props: MenuProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  const [local, elementProps] = splitProps(props, [
    'children',
    'label',
    'keepMounted',
    'cols',
    'orientation',
    'openOnFocus',
  ]);
  const keepMounted = () => local.keepMounted ?? false;
  const openOnFocus = () => local.openOnFocus ?? false;
  const [isOpen, setIsOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
  const [allowHover, setAllowHover] = createSignal(false);
  const [hasFocusInside, setHasFocusInside] = createSignal(false);

  const compositeListRefs = {
    elements: [] as Array<HTMLButtonElement | null>,
    labels: [] as Array<string | null>,
  };

  const tree = useFloatingTree();
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const isNested = parentId != null;
  const orientation = () => local.orientation ?? (local.cols ? 'both' : 'vertical');

  const parent = useContext(MenuContext);
  const item = useCompositeListItem();

  const { floatingStyles, refs, context } = useFloating({
    nodeId,
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: isNested ? 'right-start' : 'bottom-start',
    middleware: [
      offset({ mainAxis: isNested ? 0 : 4, alignmentAxis: isNested ? -4 : 0 }),
      flip(),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    enabled: () => isNested && allowHover(),
    delay: { open: 75 },
    handleClose: safePolygon({ blockPointerEvents: true }),
  });
  const click = useClick(context, {
    event: 'mousedown',
    toggle: () => !isNested || !allowHover(),
    ignoreMouse: isNested,
  });
  const focus = useFocus(context, { enabled: openOnFocus });
  const role = useRole(context, { role: 'menu' });
  const dismiss = useDismiss(context, { bubbles: true });
  const listNavigation = useListNavigation(context, {
    listRef: compositeListRefs.elements,
    activeIndex,
    nested: isNested,
    onNavigate: setActiveIndex,
    orientation,
    // eslint-disable-next-line solid/reactivity
    cols: local.cols,
  });
  const typeahead = useTypeahead(context, {
    listRef: compositeListRefs.labels,
    onMatch: (index) => (isOpen() ? setActiveIndex(index) : undefined),
    activeIndex,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    hover,
    click,
    role,
    dismiss,
    focus,
    listNavigation,
    typeahead,
  ]);

  // Event emitter allows you to communicate across tree components.
  // This effect closes all menus when an item gets clicked anywhere
  // in the tree.
  createEffect(() => {
    if (!tree) {
      return;
    }

    function handleTreeClick() {
      setIsOpen(false);
    }

    function onSubMenuOpen(event: { nodeId: string; parentId: string }) {
      if (event.nodeId !== nodeId() && event.parentId === parentId) {
        setIsOpen(false);
      }
    }

    tree.events.on('click', handleTreeClick);
    tree.events.on('menuopen', onSubMenuOpen);

    onCleanup(() => {
      tree.events.off('click', handleTreeClick);
      tree.events.off('menuopen', onSubMenuOpen);
    });
  });

  createEffect(() => {
    if (isOpen() && tree) {
      tree.events.emit('menuopen', { parentId, nodeId: nodeId() });
    }
  });

  // Determine if "hover" logic can run based on the modality of input. This
  // prevents unwanted focus synchronization as menus open and close with
  // keyboard navigation and the cursor is resting on the menu.
  createEffect(
    on(allowHover, () => {
      function onPointerMove({ pointerType }: PointerEvent) {
        if (pointerType !== 'touch') {
          setAllowHover(true);
        }
      }

      function onKeyDown() {
        setAllowHover(false);
      }

      window.addEventListener('pointermove', onPointerMove, {
        once: true,
        capture: true,
      });
      window.addEventListener('keydown', onKeyDown, true);
      onCleanup(() => {
        window.removeEventListener('pointermove', onPointerMove, {
          capture: true,
        });
        window.removeEventListener('keydown', onKeyDown, true);
      });
    }),
  );

  return (
    <FloatingNode id={nodeId()}>
      <button
        type="button"
        ref={(el) => {
          refs.setReference(el);
          item.setRef(el);
          if (typeof props.ref === 'function') {
            props.ref(el);
          } else {
            props.ref = el;
          }
        }}
        data-open={isOpen() ? '' : undefined}
        // eslint-disable-next-line no-nested-ternary
        tabIndex={!isNested ? props.tabIndex : parent.activeIndex() === item.index() ? 0 : -1}
        class={c(
          props.class || 'flex items-center justify-between gap-4 rounded px-2 py-1 text-left',
          {
            'focus:bg-blue-500 outline-none focus:text-white': isNested,
            'bg-blue-500 text-white': isOpen() && isNested && !hasFocusInside(),
            'bg-slate-200 rounded px-2 py-1': isNested && isOpen() && hasFocusInside(),
            'bg-slate-200': !isNested && isOpen(),
          },
        )}
        {...getReferenceProps(
          parent.getItemProps<HTMLButtonElement>({
            ...elementProps,
            onFocus(event) {
              callEventHandler(props.onFocus, event);
              setHasFocusInside(false);
              parent.setHasFocusInside(true);
            },
            onMouseEnter(event) {
              callEventHandler(props.onMouseEnter, event);
              if (parent.allowHover() && parent.isOpen()) {
                parent.setActiveIndex(item.index());
              }
            },
          }),
        )}
      >
        {props.label}
        {isNested && (
          <span aria-hidden="true" class="ml-4">
            Icon
          </span>
        )}
      </button>
      <MenuContext.Provider
        value={{
          activeIndex,
          setActiveIndex,
          getItemProps,
          setHasFocusInside,
          allowHover,
          isOpen,
          setIsOpen,
          parent,
        }}
      >
        <CompositeList refs={compositeListRefs}>
          {(keepMounted() || isOpen()) && (
            <FloatingPortal>
              <FloatingFocusManager
                context={context}
                modal={false}
                initialFocus={!isNested}
                returnFocus={!isNested}
              >
                <div
                  ref={refs.setFloating}
                  class={c(
                    'border-slate-900/10 rounded border bg-white bg-clip-padding p-1 shadow-lg outline-none',
                    { 'flex flex-col': !local.cols },
                    { [`grid grid-cols-[repeat(var(--cols),_minmax(0,_1fr))] gap-3`]: local.cols },
                  )}
                  style={{
                    ...floatingStyles(),
                    '--cols': local.cols,
                    // eslint-disable-next-line no-nested-ternary
                    visibility: !keepMounted() ? undefined : isOpen() ? 'visible' : 'hidden',
                  }}
                  aria-hidden={!isOpen()}
                  /**
                   * TODO: I have absolutely no idea why, but passing an empty object
                   * to getFloatingProps is necessary to get last 5 tests from
                   * useListNavigation.test.tsx to pass. For some reason, calling
                   * getFloatingProps without an empty object is triggering ocasional
                   * keydown events to be emitted twice in a row.
                   * This is probably due to the way combineProps works but I'm not sure.
                   */
                  {...getFloatingProps({})}
                >
                  {local.children}
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          )}
        </CompositeList>
      </MenuContext.Provider>
    </FloatingNode>
  );
}

interface MenuItemProps {
  label: string;
  disabled?: boolean;
}

/** @internal */
export function MenuItem(props: MenuItemProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  const [local, elementProps] = splitProps(props, ['label', 'disabled']);
  const menu = useContext(MenuContext);
  const item = useCompositeListItem({ label: () => (local.disabled ? null : local.label) });
  const tree = useFloatingTree();
  const isActive = () => item.index() === menu.activeIndex();

  return (
    <button
      {...elementProps}
      ref={(el) => {
        item.setRef(el);
        if (typeof props.ref === 'function') {
          props.ref(el);
        } else {
          props.ref = el;
        }
      }}
      type="button"
      role="menuitem"
      disabled={local.disabled}
      tabIndex={isActive() ? 0 : -1}
      class={c('focus:bg-blue-500 flex rounded px-2 py-1 text-left outline-none focus:text-white', {
        'opacity-40': local.disabled,
      })}
      {...menu.getItemProps<HTMLButtonElement>({
        active: isActive(),
        onClick(event) {
          callEventHandler(elementProps.onClick, event);
          tree?.events.emit('click');
        },
        onFocus(event) {
          callEventHandler(elementProps.onFocus, event);
          menu.setHasFocusInside(true);
        },
        onMouseEnter(event) {
          callEventHandler(elementProps.onMouseEnter, event);
          if (menu.allowHover() && menu.isOpen()) {
            menu.setActiveIndex(item.index());
          }
        },
        onKeyDown(event) {
          function closeParents(parent: MenuContextType | null) {
            parent?.setIsOpen(false);
            if (parent?.parent) {
              closeParents(parent.parent);
            }
          }

          if (
            event.key === 'ArrowRight' &&
            // If the root reference is in a menubar, close parents
            tree?.nodesRef[0].context?.elements.domReference()?.closest('[role="menubar"]')
          ) {
            closeParents(menu.parent);
          }
        },
      })}
    >
      {local.label}
    </button>
  );
}

/** @internal */
export function Menu(props: MenuProps & JSX.HTMLAttributes<HTMLButtonElement>) {
  const parentId = useFloatingParentNodeId();

  return (
    <Show when={parentId === null} fallback={<MenuComponent {...props} />}>
      <FloatingTree>
        <MenuComponent {...props} />
      </FloatingTree>
    </Show>
  );
}

/** @internal */
export function Main() {
  /* eslint-disable no-console */
  return (
    <>
      <h1 class="mb-8 text-5xl font-bold">Menu</h1>
      <div class="border-slate-400 mb-4 grid h-[20rem] place-items-center rounded border lg:w-[40rem]">
        <Menu label="Edit">
          <MenuItem label="Undo" onClick={() => console.log('Undo')} />
          <MenuItem label="Redo" />
          <MenuItem label="Cut" disabled />
          <Menu label="Copy as" keepMounted>
            <MenuItem label="Text" />
            <MenuItem label="Video" />
            <Menu label="Image" keepMounted cols={2} orientation="horizontal">
              <MenuItem label=".png" />
              <MenuItem label=".jpg" />
              <MenuItem label=".svg" />
              <MenuItem label=".gif" />
            </Menu>
            <MenuItem label="Audio" />
          </Menu>
          <Menu label="Share">
            <MenuItem label="Mail" />
            <MenuItem label="Instagram" />
          </Menu>
        </Menu>
      </div>
    </>
  );
}

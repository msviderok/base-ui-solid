import { createSignal, splitProps, type JSX } from 'solid-js';
import {
  flip,
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFocus,
  useHover,
  useInteractions,
} from '../../src/floating-ui-solid';
import { getEmptyRootContext } from '../../src/floating-ui-solid/utils/getEmptyRootContext';

interface SubItemProps {
  label: string;
  href: string;
}

/** @internal */
export function NavigationSubItem(props: SubItemProps & JSX.HTMLAttributes<HTMLAnchorElement>) {
  const [local, elementProps] = splitProps(props, ['label']);
  return (
    <a {...elementProps} class="NavigationItem">
      {local.label}
    </a>
  );
}

interface ItemProps {
  label: string;
  href: string;
  children?: JSX.Element;
}

/** @internal */
export function NavigationItem(props: ItemProps & JSX.HTMLAttributes<HTMLAnchorElement>) {
  const [local, elementProps] = splitProps(props, ['children', 'label', 'href']);
  const [open, setOpen] = createSignal(false);
  const hasChildren = () => 'children' in local;
  const fallbackContext = getEmptyRootContext();

  const nodeId = useFloatingNodeId();

  const { floatingStyles, refs, context } = useFloating({
    open,
    nodeId,
    onOpenChange: setOpen,
    middleware: [offset(8), flip(), shift()],
    placement: 'right-start',
  });

  const hover = useHover(() => (hasChildren() ? context : fallbackContext), {
    handleClose: safePolygon(),
  });
  const focus = useFocus(context, {
    enabled: hasChildren,
  });
  const dismiss = useDismiss(context, {
    enabled: hasChildren,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss]);

  return (
    <FloatingNode id={nodeId()}>
      <li>
        <a
          href={local.href}
          ref={(el) => {
            if (typeof elementProps.ref === 'function') {
              elementProps.ref(el);
            } else {
              elementProps.ref = el;
            }
            refs.setReference(el);
          }}
          class="bg-slate-100 my-1 flex w-48 items-center justify-between rounded p-2"
          {...getReferenceProps(elementProps as any)}
        >
          {local.label}
        </a>
      </li>
      <FloatingPortal>
        {open() && (
          <FloatingFocusManager context={context} modal={false} initialFocus={false}>
            <div
              data-testid="subnavigation"
              ref={refs.setFloating}
              class="bg-slate-100 flex flex-col overflow-y-auto rounded px-4 py-2 backdrop-blur-sm outline-none"
              style={floatingStyles()}
              {...getFloatingProps()}
            >
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
              <ul class="flex flex-col">{local.children}</ul>
            </div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </FloatingNode>
  );
}

interface NavigationProps {
  children?: JSX.Element;
}

/** @internal */
export function Navigation(props: NavigationProps) {
  return (
    <nav class="Navigation">
      <ul class="NavigationList">{props.children}</ul>
    </nav>
  );
}

/** @internal */
export function Main() {
  return (
    <>
      <h1 class="mb-8 text-5xl font-bold">Navigation</h1>
      <div class="border-slate-400 mb-4 grid h-[20rem] place-items-center rounded border lg:w-[40rem]">
        <Navigation>
          <NavigationItem label="Home" href="#" />
          <NavigationItem label="Product" href="#">
            <NavigationSubItem label="Link 1" href="#" />
            <NavigationSubItem label="Link 2" href="#" />
            <NavigationSubItem label="Link 3" href="#" />
          </NavigationItem>
          <NavigationItem label="About" href="#" />
        </Navigation>
      </div>
    </>
  );
}

import { createSignal, createUniqueId, Show, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
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
  useHover,
  useInteractions,
  useRole,
} from '../../src/floating-ui-solid';
import type { Placement } from '../../src/floating-ui-solid/types';
import { getEmptyRootContext } from '../../src/floating-ui-solid/utils/getEmptyRootContext';

/** @internal */
export function Main() {
  return (
    <>
      <h1 class="mb-8 text-5xl font-bold">Popover</h1>
      <div class="border-slate-400 mb-4 grid h-[20rem] place-items-center rounded border lg:w-[40rem]">
        <Popover
          modal
          bubbles
          render={(props1) => (
            <>
              <h2 id={props1.labelId} class="mb-2 text-2xl font-bold">
                Title
              </h2>
              <p id={props1.descriptionId} class="mb-2">
                Description
              </p>
              <Popover
                modal
                bubbles
                render={(props2) => (
                  <>
                    <h2 id={props2.labelId} class="mb-2 text-2xl font-bold">
                      Title
                    </h2>
                    <p id={props2.descriptionId} class="mb-2">
                      Description
                    </p>
                    <Popover
                      modal
                      bubbles={false}
                      render={(props3) => (
                        <>
                          <h2 id={props3.labelId} class="mb-2 text-2xl font-bold">
                            Title
                          </h2>
                          <p id={props3.descriptionId} class="mb-2">
                            Description
                          </p>
                          <button type="button" onClick={props3.close} class="font-bold">
                            Close
                          </button>
                        </>
                      )}
                    >
                      {(p) => (
                        <button type="button" {...p}>
                          My button
                        </button>
                      )}
                    </Popover>
                    <button type="button" onClick={props2.close} class="font-bold">
                      Close
                    </button>
                  </>
                )}
              >
                {(p) => (
                  <button type="button" {...p}>
                    My button
                  </button>
                )}
              </Popover>
              <button type="button" onClick={props1.close} class="font-bold">
                Close
              </button>
            </>
          )}
        >
          {(p) => (
            <button type="button" {...p}>
              My button
            </button>
          )}
        </Popover>
      </div>
    </>
  );
}
interface Props {
  render: Component<{ close: () => void; labelId: string; descriptionId: string }>;
  placement?: Placement;
  modal?: boolean;
  children?: Component;
  bubbles?: boolean;
  hover?: boolean;
}

/** @internal */
function PopoverComponent(props: Props) {
  const [open, setOpen] = createSignal(false);

  const modal = () => props.modal ?? true;
  const bubbles = () => props.bubbles ?? true;
  const hover = () => props.hover ?? false;

  const nodeId = useFloatingNodeId();
  const { floatingStyles, refs, context } = useFloating({
    nodeId,
    open,
    placement: () => props.placement,
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const id = createUniqueId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const fallbackContext = getEmptyRootContext();

  const hoverInteraction = useHover(() => (hover() ? context : fallbackContext), {
    handleClose: safePolygon({ blockPointerEvents: true }),
  });
  const click = useClick(context);
  const role = useRole(context);
  const dismiss = useDismiss(context, { bubbles });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hoverInteraction,
    click,
    role,
    dismiss,
  ]);

  return (
    <FloatingNode id={nodeId()}>
      <Dynamic
        component={props.children}
        {...getReferenceProps({
          ref: refs.setReference,
          'data-open': open() ? '' : undefined,
        } as JSX.HTMLAttributes<Element>)}
      />

      <FloatingPortal>
        {open() && (
          <FloatingFocusManager context={context} modal={modal()}>
            <div
              class="border-slate-900/10 rounded border bg-white bg-clip-padding px-4 py-6 shadow-md"
              ref={refs.setFloating}
              style={floatingStyles()}
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              {...getFloatingProps()}
            >
              <Dynamic
                component={props.render}
                labelId={labelId}
                descriptionId={descriptionId}
                close={() => setOpen(false)}
              />
            </div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </FloatingNode>
  );
}

/** @internal */
export function Popover(props: Props) {
  const parentId = useFloatingParentNodeId();

  // This is a root, so we wrap it with the tree
  return (
    <Show when={parentId === null} fallback={<PopoverComponent {...props} />}>
      <FloatingTree>
        <PopoverComponent {...props} />
      </FloatingTree>
    </Show>
  );
}

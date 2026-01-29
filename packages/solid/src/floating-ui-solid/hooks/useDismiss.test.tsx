import { flushMicrotasks } from '#test-utils';
import { isJSDOM } from '@base-ui/utils/detectBrowser';
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal, Show, splitProps, type Accessor, type JSX } from 'solid-js';
import { vi } from 'vitest';
import { access } from '../../solid-helpers';
import { REASONS } from '../../utils/reasons';
import {
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFocus,
  useInteractions,
} from '../index';
import type { UseDismissProps } from './useDismiss';
import { normalizeProp } from './useDismiss';

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    (callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    },
  );
});

function App(
  props: UseDismissProps & {
    onClose?: () => void;
  },
) {
  const [open, setOpen] = createSignal(true);
  const { context, refs } = useFloating({
    open,
    onOpenChange(openArg, data) {
      setOpen(openArg);
      const reason = data?.reason;
      const outsidePress =
        typeof props.outsidePress === 'function'
          ? props.outsidePress(event as MouseEvent)
          : props.outsidePress;

      if (outsidePress) {
        expect(reason).toBe(REASONS.outsidePress);
      } else if (access(props.escapeKey)) {
        expect(reason).toBe(REASONS.escapeKey);
        if (!openArg) {
          props.onClose?.();
        }
      } else if (access(props.referencePress)) {
        expect(reason).toBe(REASONS.triggerPress);
      } else if (access(props.ancestorScroll)) {
        expect(reason).toBe(REASONS.none);
      }
    },
  });

  const dismiss = useDismiss(context, props);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return (
    <>
      <button {...getReferenceProps({ ref: refs.setReference })} />
      <Show when={open()}>
        <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })}>
          <input />
        </div>
      </Show>
    </>
  );
}

describe.skipIf(!isJSDOM)('useDismiss', () => {
  describe('true', () => {
    test('dismisses with escape key', async () => {
      render(() => <App />);
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      await flushMicrotasks();
    });

    test('does not dismiss with escape key if IME is active', async () => {
      const onClose = vi.fn();

      render(() => <App onClose={onClose} escapeKey={true} />);

      const textbox = screen.getByRole('textbox');

      textbox.focus();

      // Simulate behavior when "あ" (Japanese) is entered and Esc is pressed for IME
      // cancellation.
      fireEvent.input(textbox, { target: { value: 'あ' } });
      fireEvent.compositionStart(textbox);
      fireEvent.keyDown(textbox, { key: 'Escape' });
      fireEvent.compositionEnd(textbox);

      // Wait for the compositionend timeout tick due to Safari
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(onClose).toHaveBeenCalledTimes(0);

      fireEvent.keyDown(textbox, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('dismisses with outside pointer press', async () => {
      render(() => <App />);
      await userEvent.click(document.body);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('dismisses with reference press', async () => {
      render(() => <App referencePress={true} />);
      await userEvent.click(screen.getByRole('button'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('dismisses with native click', async () => {
      render(() => <App referencePress={true} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('dismisses with ancestor scroll', async () => {
      render(() => <App ancestorScroll={true} />);
      fireEvent.scroll(window);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      await flushMicrotasks();
    });

    test('outsidePress function guard', async () => {
      render(() => <App outsidePress={false} />);
      await userEvent.click(document.body);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('outsidePress ignored for third party elements', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(true);

        const { context, refs } = useFloating({
          open: isOpen,
          onOpenChange: setIsOpen,
        });

        const dismiss = useDismiss(context);

        const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={isOpen()}>
              <FloatingFocusManager context={context}>
                <div role="dialog" {...getFloatingProps({ ref: refs.setFloating })} />
              </FloatingFocusManager>
            </Show>
          </>
        );
      }

      render(() => <App />);

      const thirdParty = document.createElement('div');
      thirdParty.setAttribute('data-testid', 'third-party');
      document.body.append(thirdParty);
      await userEvent.click(thirdParty);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      thirdParty.remove();
    });

    test('outsidePress not ignored for nested floating elements', async () => {
      function Popover(props: { children?: JSX.Element; id: string; modal?: boolean | null }) {
        const [isOpen, setIsOpen] = createSignal(true);

        const { context, refs } = useFloating({
          open: isOpen,
          onOpenChange: setIsOpen,
        });

        const dismiss = useDismiss(context);

        const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

        const dialogJsx = (
          <div
            role="dialog"
            data-testid={props.id}
            {...getFloatingProps({ ref: refs.setFloating })}
          >
            {props.children}
          </div>
        );

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            {isOpen() && (
              <>
                {props.modal == null ? (
                  dialogJsx
                ) : (
                  <FloatingFocusManager context={context} modal={props.modal}>
                    {dialogJsx}
                  </FloatingFocusManager>
                )}
              </>
            )}
          </>
        );
      }

      function App(props: { modal: [boolean, boolean] | null }) {
        return (
          <Popover id="popover-1" modal={props.modal ? props.modal[0] : true}>
            <Popover id="popover-2" modal={props.modal ? props.modal[1] : null} />
          </Popover>
        );
      }

      const { unmount } = render(() => <App modal={[true, true]} />);

      let popover1 = screen.getByTestId('popover-1');
      let popover2 = screen.getByTestId('popover-2');
      await userEvent.click(popover2);
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      expect(popover2).not.toBeInTheDocument();

      unmount();

      const { unmount: unmount2 } = render(() => <App modal={[true, false]} />);

      popover1 = screen.getByTestId('popover-1');
      popover2 = screen.getByTestId('popover-2');

      await userEvent.click(popover2);
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      expect(popover2).not.toBeInTheDocument();

      unmount2();

      const { unmount: unmount3 } = render(() => <App modal={[false, true]} />);

      popover1 = screen.getByTestId('popover-1');
      popover2 = screen.getByTestId('popover-2');

      await userEvent.click(popover2);
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      expect(popover2).not.toBeInTheDocument();

      unmount3();

      render(() => <App modal={null} />);

      popover1 = screen.getByTestId('popover-1');
      popover2 = screen.getByTestId('popover-2');

      await userEvent.click(popover2);
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      expect(popover2).not.toBeInTheDocument();
    });
  });

  describe('false', () => {
    test('dismisses with escape key', async () => {
      render(() => <App escapeKey={false} />);
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('dismisses with outside press', async () => {
      render(() => <App outsidePress={false} />);
      await userEvent.click(document.body);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('dismisses with reference pointer down', async () => {
      render(() => <App referencePress={false} />);
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('dismisses with ancestor scroll', async () => {
      render(() => <App ancestorScroll={false} />);
      fireEvent.scroll(window);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('does not dismiss when clicking portaled children', async () => {
      function App() {
        const [open, setOpen] = createSignal(true);
        const { context, refs } = useFloating({
          open,
          onOpenChange: setOpen,
        });

        const dismiss = useDismiss(context);
        const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={open()}>
              <div {...getFloatingProps({ ref: refs.setFloating })}>
                <FloatingPortal>
                  <button data-testid="portaled-button" />
                </FloatingPortal>
              </div>
            </Show>
          </>
        );
      }

      render(() => <App />);

      fireEvent.pointerDown(screen.getByTestId('portaled-button'), {
        bubbles: true,
      });
      await flushMicrotasks();

      expect(screen.getByTestId('portaled-button')).toBeInTheDocument();
    });

    test('outsidePress function guard', async () => {
      render(() => <App outsidePress={true} />);
      await userEvent.click(document.body);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('bubbles', () => {
    function Dialog(props: UseDismissProps & { testId: string; children: JSX.Element }) {
      const [local, others] = splitProps(props, ['testId', 'children']);
      const [open, setOpen] = createSignal(true);
      const nodeId = useFloatingNodeId();

      const { context, refs } = useFloating({
        open,
        onOpenChange: setOpen,
        nodeId,
      });

      const dismiss = useDismiss(context, others);
      const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

      return (
        <FloatingNode id={nodeId()}>
          <button {...getReferenceProps({ ref: refs.setReference })} />
          {open() && (
            <FloatingFocusManager context={context}>
              <div {...getFloatingProps({ ref: refs.setFloating })} data-testid={local.testId}>
                {local.children}
              </div>
            </FloatingFocusManager>
          )}
        </FloatingNode>
      );
    }

    function NestedDialog(props: UseDismissProps & { testId: string; children: JSX.Element }) {
      const parentId = useFloatingParentNodeId();

      return (
        <Show when={parentId == null} fallback={<Dialog {...props} />}>
          <FloatingTree>
            <Dialog {...props} />
          </FloatingTree>
        </Show>
      );
    }

    describe('prop resolution', () => {
      test('undefined', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp();

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(true);
      });

      test('false', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } =
          normalizeProp(false);

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(false);
      });

      test('{}', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp(
          {},
        );

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(true);
      });

      test('{ escapeKey: false }', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp({
          escapeKey: false,
        });

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(true);
      });

      test('{ outsidePress: false }', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp({
          outsidePress: false,
        });

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(false);
      });
    });

    describe('outsidePress', () => {
      test('true', async () => {
        render(() => (
          <NestedDialog testId="outer">
            <NestedDialog testId="inner">
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        fireEvent.pointerDown(document.body);

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('false', async () => {
        render(() => (
          <NestedDialog testId="outer" bubbles={{ outsidePress: false }}>
            <NestedDialog testId="inner" bubbles={{ outsidePress: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        fireEvent.pointerDown(document.body);

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        fireEvent.pointerDown(document.body);

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('mixed', async () => {
        render(() => (
          <NestedDialog testId="outer" bubbles={{ outsidePress: true }}>
            <NestedDialog testId="inner" bubbles={{ outsidePress: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        fireEvent.pointerDown(document.body);

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        fireEvent.pointerDown(document.body);

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });
    });

    describe('escapeKey', () => {
      test('without FloatingTree', async () => {
        function App() {
          const [popoverOpen, setPopoverOpen] = createSignal(true);
          const [tooltipOpen, setTooltipOpen] = createSignal(false);

          const popover = useFloating({
            open: popoverOpen,
            onOpenChange: setPopoverOpen,
          });
          const tooltip = useFloating({
            open: tooltipOpen,
            onOpenChange: setTooltipOpen,
          });

          const popoverInteractions = useInteractions([useDismiss(popover.context)]);
          const tooltipInteractions = useInteractions([
            useFocus(tooltip.context, { visibleOnly: () => false }),
            useDismiss(tooltip.context),
          ]);

          return (
            <>
              <button
                ref={popover.refs.setReference}
                {...popoverInteractions.getReferenceProps()}
              />
              <Show when={popoverOpen()}>
                <div
                  role="dialog"
                  ref={popover.refs.setFloating}
                  {...popoverInteractions.getFloatingProps()}
                >
                  <button
                    data-testid="focus-button"
                    ref={tooltip.refs.setReference}
                    {...tooltipInteractions.getReferenceProps()}
                  />
                </div>
              </Show>
              <Show when={tooltipOpen()}>
                <div
                  role="tooltip"
                  ref={tooltip.refs.setFloating}
                  {...tooltipInteractions.getFloatingProps()}
                />
              </Show>
            </>
          );
        }

        render(() => <App />);

        screen.getByTestId('focus-button').focus();

        await waitFor(() => {
          expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        await userEvent.keyboard('{Escape}');

        await waitFor(() => {
          expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      test('true', async () => {
        render(() => (
          <NestedDialog testId="outer" bubbles={true}>
            <NestedDialog testId="inner" bubbles={true}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('false', async () => {
        render(() => (
          <NestedDialog testId="outer" bubbles={{ escapeKey: false }}>
            <NestedDialog testId="inner" bubbles={{ escapeKey: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        await userEvent.keyboard('{Escape}');

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('mixed', async () => {
        render(() => (
          <NestedDialog testId="outer" bubbles={{ escapeKey: true }}>
            <NestedDialog testId="inner" bubbles={{ escapeKey: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        await userEvent.keyboard('{Escape}');

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });
    });
  });

  describe('capture', () => {
    describe('prop resolution', () => {
      test('undefined', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp();

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(true);
      });

      test('{}', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp(
          {},
        );

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(true);
      });

      test('true', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } =
          normalizeProp(true);

        expect(escapeKeyCapture).toBe(true);
        expect(outsidePressCapture).toBe(true);
      });

      test('false', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } =
          normalizeProp(false);

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(false);
      });

      test('{ escapeKey: true }', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp({
          escapeKey: true,
        });

        expect(escapeKeyCapture).toBe(true);
        expect(outsidePressCapture).toBe(true);
      });

      test('{ outsidePress: false }', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp({
          outsidePress: false,
        });

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(false);
      });
    });

    function Overlay(props: { children: JSX.Element }) {
      return (
        <div
          style={{ width: '100vw', height: '100vh' }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
            }
          }}
        >
          <span>outside</span>
          {props.children}
        </div>
      );
    }

    function Dialog(props: UseDismissProps & { id: string; children: JSX.Element }) {
      const [local, others] = splitProps(props, ['id', 'children']);
      const [open, setOpen] = createSignal(true);
      const nodeId = useFloatingNodeId();

      const { context, refs } = useFloating({
        open,
        onOpenChange: setOpen,
        nodeId,
      });

      const dismiss = useDismiss(context, others);
      const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

      return (
        <FloatingNode id={nodeId()}>
          <button {...getReferenceProps({ ref: refs.setReference })} />
          {open() && (
            <FloatingPortal>
              <FloatingFocusManager context={context}>
                <div {...getFloatingProps({ ref: refs.setFloating })}>
                  <span>{local.id}</span>
                  {local.children}
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          )}
        </FloatingNode>
      );
    }

    function NestedDialog(props: UseDismissProps & { id: string; children: JSX.Element }) {
      const parentId = useFloatingParentNodeId();

      return (
        <Show when={parentId == null} fallback={<Dialog {...props} />}>
          <FloatingTree>
            <Dialog {...props} />
          </FloatingTree>
        </Show>
      );
    }

    describe('outsidePress', () => {
      test('true', async () => {
        const user = userEvent.setup();

        render(() => (
          <Overlay>
            <NestedDialog id="outer">
              <NestedDialog id="inner">{null}</NestedDialog>
            </NestedDialog>
          </Overlay>
        ));

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.getByText('inner')).toBeInTheDocument();

        await user.click(screen.getByText('outer'));

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();

        await user.click(screen.getByText('outside'));

        expect(screen.queryByText('outer')).not.toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();
      });
    });

    describe('escapeKey', () => {
      test('false', async () => {
        const user = userEvent.setup();

        render(() => (
          <Overlay>
            <NestedDialog id="outer">
              <NestedDialog id="inner">{null}</NestedDialog>
            </NestedDialog>
          </Overlay>
        ));

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.getByText('inner')).toBeInTheDocument();

        await user.keyboard('{Escape}');

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();

        await user.keyboard('{Escape}');

        expect(screen.queryByText('outer')).not.toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();
      });
    });
  });

  describe('outsidePressEvent: intentional', () => {
    test('dragging outside the floating element does not close', async () => {
      render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      fireEvent.mouseDown(floatingEl);
      fireEvent.mouseUp(document.body);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('dragging inside the floating element does not close', async () => {
      render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      fireEvent.mouseDown(document.body);
      fireEvent.mouseUp(floatingEl);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('dragging outside the floating element then clicking outside closes', async () => {
      render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      fireEvent.mouseDown(floatingEl);
      fireEvent.mouseUp(document.body);
      // A click event will have fired before the proper outside click.
      fireEvent.click(document.body);
      fireEvent.click(document.body);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  test('nested floating elements with different portal containers', async () => {
    function ButtonWithFloating(props: {
      children?: JSX.Element;
      portalContainer?: Accessor<HTMLElement | null>;
      triggerText: string;
    }) {
      const [open, setOpen] = createSignal(false);
      const { context, refs, floatingStyles } = useFloating({
        open,
        onOpenChange: setOpen,
      });

      const click = useClick(context);
      const dismiss = useDismiss(context);

      const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

      return (
        <>
          <button {...getReferenceProps({ ref: refs.setReference })}>{props.triggerText}</button>
          {open() && (
            <FloatingPortal container={props.portalContainer?.()}>
              <FloatingFocusManager context={context} modal={false}>
                <div {...getFloatingProps({ ref: refs.setFloating })} style={floatingStyles()}>
                  {props.children}
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          )}
        </>
      );
    }

    function App() {
      const [otherContainer, setOtherContainer] = createSignal<HTMLDivElement | null>(null);

      const portal1 = undefined;
      const portal2 = otherContainer;

      return (
        <>
          <ButtonWithFloating portalContainer={portal1} triggerText="open 1">
            <ButtonWithFloating portalContainer={portal2} triggerText="open 2">
              <button>nested</button>
            </ButtonWithFloating>
          </ButtonWithFloating>
          <div ref={setOtherContainer} />
        </>
      );
    }

    render(() => <App />);

    await userEvent.click(screen.getByText('open 1'));
    expect(screen.getByText('open 2')).toBeInTheDocument();

    await userEvent.click(screen.getByText('open 2'));
    await flushMicrotasks();

    expect(screen.getByText('open 1')).toBeInTheDocument();
    expect(screen.getByText('open 2')).toBeInTheDocument();
    expect(screen.getByText('nested')).toBeInTheDocument();
  });
});

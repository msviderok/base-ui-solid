import { createRenderer, flushMicrotasks, isJSDOM, popupConformanceTests } from '#test-utils';
import { PreviewCard } from '@msviderok/base-ui-solid/preview-card';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createSignal } from 'solid-js';
import { CLOSE_DELAY, OPEN_DELAY } from '../utils/constants';

function Root(props: PreviewCard.Root.Props) {
  return <PreviewCard.Root {...props} />;
}

function Trigger(props: PreviewCard.Trigger.Props) {
  return (
    <PreviewCard.Trigger href="#" {...props}>
      Link
    </PreviewCard.Trigger>
  );
}

describe('<PreviewCard.Root />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render, clock } = createRenderer();

  popupConformanceTests({
    createComponent: (props) => (
      <PreviewCard.Root {...props.root}>
        <PreviewCard.Trigger {...props.trigger}>Link</PreviewCard.Trigger>
        <PreviewCard.Portal {...props.portal}>
          <PreviewCard.Positioner>
            <PreviewCard.Popup {...props.popup}>Content</PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ),
    render: (...args) => render(...(args as Parameters<typeof render>)),
    triggerMouseAction: 'hover',
  });

  describe('uncontrolled open', () => {
    clock.withFakeTimers();

    it('should open when the trigger is hovered', async () => {
      render(() => (
        <Root>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');

      fireEvent.pointerDown(trigger, { pointerType: 'mouse' });
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(OPEN_DELAY);

      await flushMicrotasks();

      expect(screen.getByText('Content')).not.to.equal(null);
    });

    it('should close when the trigger is unhovered', async () => {
      render(() => (
        <Root>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');

      fireEvent.pointerDown(trigger, { pointerType: 'mouse' });
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(OPEN_DELAY);

      await flushMicrotasks();

      fireEvent.mouseLeave(trigger);

      clock.tick(CLOSE_DELAY);

      expect(screen.queryByText('Content')).to.equal(null);
    });

    it('should open when the trigger is focused', async () => {
      if (!isJSDOM) {
        // Ignore due to `:focus-visible` being required in the browser.
        return;
      }

      render(() => (
        <Root>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');

      trigger.focus();

      clock.tick(OPEN_DELAY);

      await flushMicrotasks();

      expect(screen.getByText('Content')).not.to.equal(null);
    });

    it('should close when the trigger is blurred', async () => {
      render(() => (
        <Root>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');

      trigger.focus();
      clock.tick(OPEN_DELAY);
      await flushMicrotasks();

      trigger.blur();
      clock.tick(CLOSE_DELAY);

      expect(screen.queryByText('Content')).to.equal(null);
    });
  });

  describe('prop: onOpenChange', () => {
    clock.withFakeTimers();

    it('should call onOpenChange when the open state changes', async () => {
      const handleChange = spy();

      function App() {
        const [open, setOpen] = createSignal(false);

        return (
          <Root
            open={open()}
            onOpenChange={(nextOpen) => {
              handleChange(open());
              setOpen(nextOpen);
            }}
          >
            <Trigger />
            <PreviewCard.Portal>
              <PreviewCard.Positioner>
                <PreviewCard.Popup>Content</PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          </Root>
        );
      }

      render(() => <App />);

      expect(screen.queryByText('Content')).to.equal(null);

      const trigger = screen.getByRole('link');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(OPEN_DELAY);

      await flushMicrotasks();

      expect(screen.getByText('Content')).not.to.equal(null);

      fireEvent.mouseLeave(trigger);

      clock.tick(CLOSE_DELAY);

      expect(screen.queryByText('Content')).to.equal(null);
      expect(handleChange.callCount).to.equal(2);
      expect(handleChange.firstCall.args[0]).to.equal(false);
      expect(handleChange.secondCall.args[0]).to.equal(true);
    });

    it('should not call onChange when the open state does not change', async () => {
      const handleChange = spy();

      function App() {
        const [open, setOpen] = createSignal(false);

        return (
          <Root
            open={open()}
            onOpenChange={(nextOpen) => {
              handleChange(open());
              setOpen(nextOpen);
            }}
          >
            <Trigger />
            <PreviewCard.Portal>
              <PreviewCard.Positioner>
                <PreviewCard.Popup>Content</PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          </Root>
        );
      }

      render(() => <App />);

      expect(screen.queryByText('Content')).to.equal(null);

      const trigger = screen.getByRole('link');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(OPEN_DELAY);

      await flushMicrotasks();

      expect(screen.getByText('Content')).not.to.equal(null);
      expect(handleChange.callCount).to.equal(1);
      expect(handleChange.firstCall.args[0]).to.equal(false);
    });
  });

  describe('prop: defaultOpen', () => {
    clock.withFakeTimers();

    it('should open when the component is rendered', async () => {
      render(() => (
        <Root defaultOpen>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      expect(screen.getByText('Content')).not.to.equal(null);
    });

    it('should not open when the component is rendered and open is controlled', async () => {
      render(() => (
        <Root defaultOpen open={false}>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      expect(screen.queryByText('Content')).to.equal(null);
    });

    it('should not close when the component is rendered and open is controlled', async () => {
      render(() => (
        <Root defaultOpen open>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      expect(screen.getByText('Content')).not.to.equal(null);
    });

    it('should remain uncontrolled', async () => {
      render(() => (
        <Root defaultOpen>
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      expect(screen.getByText('Content')).not.to.equal(null);

      const trigger = screen.getByRole('link');

      fireEvent.mouseLeave(trigger);

      clock.tick(CLOSE_DELAY);

      expect(screen.queryByText('Content')).to.equal(null);
    });
  });

  describe('prop: delay', () => {
    clock.withFakeTimers();

    it('should open after delay with rest type by default', async () => {
      render(() => (
        <Root>
          <Trigger delay={100} />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      await flushMicrotasks();

      expect(screen.queryByText('Content')).to.equal(null);

      clock.tick(100);

      await flushMicrotasks();

      expect(screen.getByText('Content')).not.to.equal(null);
    });
  });

  describe('prop: closeDelay', () => {
    clock.withFakeTimers();

    it('should close after delay', async () => {
      render(() => (
        <Root>
          <Trigger closeDelay={100} />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(OPEN_DELAY);

      await flushMicrotasks();

      expect(screen.getByText('Content')).not.to.equal(null);

      fireEvent.mouseLeave(trigger);

      expect(screen.getByText('Content')).not.to.equal(null);

      clock.tick(100);

      expect(screen.queryByText('Content')).to.equal(null);
    });
  });

  describe('BaseUIChangeEventDetails', () => {
    it('onOpenChange cancel() prevents opening while uncontrolled', async () => {
      render(() => (
        <Root
          onOpenChange={(nextOpen, eventDetails) => {
            if (nextOpen) {
              eventDetails.cancel();
            }
          }}
        >
          <Trigger />
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');
      fireEvent.pointerDown(trigger, { pointerType: 'mouse' });
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await flushMicrotasks();

      expect(screen.queryByText('Content')).to.equal(null);
    });
  });

  describe.skipIf(!isJSDOM)('prop: actionsRef', () => {
    it('unmounts the preview card when the `unmount` method is called', async () => {
      const actionsRef = {
        unmount: spy(),
      };

      const { user } = render(() => (
        <Root actionsRef={actionsRef}>
          <Trigger delay={0} closeDelay={0}>
            Open
          </Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner data-testid="positioner">
              <PreviewCard.Popup>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </Root>
      ));

      const trigger = screen.getByRole('link');
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('positioner')).not.to.equal(null);
      });

      await user.unhover(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('positioner')).not.to.equal(null);
      });

      actionsRef.unmount();

      await waitFor(() => {
        expect(screen.queryByTestId('positioner')).to.equal(null);
      });
    });
  });

  describe.skipIf(isJSDOM)('prop: onOpenChangeComplete', () => {
    it('is called on close when there is no exit animation defined', async () => {
      const onOpenChangeComplete = spy();

      function Test() {
        const [open, setOpen] = createSignal(true);
        return (
          <div>
            <button onClick={() => setOpen(false)}>Close</button>
            <PreviewCard.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid="popup" />
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </PreviewCard.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('popup')).to.equal(null);
      });

      expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
      expect(onOpenChangeComplete.lastCall.args[0]).to.equal(false);
    });

    it('is called on close when the exit animation finishes', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const onOpenChangeComplete = spy();

      function Test() {
        const style = `
          @keyframes test-anim {
            to {
              opacity: 0;
            }
          }

          .animation-test-indicator[data-ending-style] {
            animation: test-anim 1ms;
          }
        `;

        const [open, setOpen] = createSignal(true);

        return (
          <div>
            {/* eslint-disable-next-line solid/no-innerhtml */}
            <style innerHTML={style} />
            <button onClick={() => setOpen(false)}>Close</button>
            <PreviewCard.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup class="animation-test-indicator" data-testid="popup" />
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </PreviewCard.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);

      expect(screen.getByTestId('popup')).not.to.equal(null);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('popup')).to.equal(null);
      });

      expect(onOpenChangeComplete.lastCall.args[0]).to.equal(false);
    });
  });

  describe.skipIf(isJSDOM)('prop: onOpenChangeComplete', () => {
    it('is called on close when there is no exit animation defined', async () => {
      const onOpenChangeComplete = spy();

      function Test() {
        const [open, setOpen] = createSignal(true);
        return (
          <div>
            <button onClick={() => setOpen(false)}>Close</button>
            <PreviewCard.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid="popup" />
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </PreviewCard.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('popup')).to.equal(null);
      });

      expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
      expect(onOpenChangeComplete.lastCall.args[0]).to.equal(false);
    });

    it('is called on close when the exit animation finishes', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const onOpenChangeComplete = spy();

      function Test() {
        const style = `
          @keyframes test-anim {
            to {
              opacity: 0;
            }
          }

          .animation-test-indicator[data-ending-style] {
            animation: test-anim 1ms;
          }
        `;

        const [open, setOpen] = createSignal(true);

        return (
          <div>
            {/* eslint-disable-next-line solid/no-innerhtml */}
            <style innerHTML={style} />
            <button onClick={() => setOpen(false)}>Close</button>
            <PreviewCard.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup class="animation-test-indicator" data-testid="popup" />
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </PreviewCard.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);

      expect(screen.getByTestId('popup')).not.to.equal(null);

      // Wait for open animation to finish
      await waitFor(() => {
        expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
      });

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('popup')).to.equal(null);
      });

      expect(onOpenChangeComplete.lastCall.args[0]).to.equal(false);
    });

    it('is called on open when there is no enter animation defined', async () => {
      const onOpenChangeComplete = spy();

      function Test() {
        const [open, setOpen] = createSignal(false);
        return (
          <div>
            <button onClick={() => setOpen(true)}>Open</button>
            <PreviewCard.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid="popup" />
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </PreviewCard.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);

      const openButton = screen.getByText('Open');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.queryByTestId('popup')).not.to.equal(null);
      });

      expect(onOpenChangeComplete.callCount).to.equal(2);
      expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
    });

    it('is called on open when the enter animation finishes', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const onOpenChangeComplete = spy();

      function Test() {
        const style = `
          @keyframes test-anim {
            from {
              opacity: 0;
            }
          }

          .animation-test-indicator[data-starting-style] {
            animation: test-anim 1ms;
          }
        `;

        const [open, setOpen] = createSignal(false);

        return (
          <div>
            {/* eslint-disable-next-line solid/no-innerhtml */}
            <style innerHTML={style} />
            <button onClick={() => setOpen(true)}>Open</button>
            <PreviewCard.Root
              open={open()}
              onOpenChange={setOpen}
              onOpenChangeComplete={onOpenChangeComplete}
            >
              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup class="animation-test-indicator" data-testid="popup" />
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </PreviewCard.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);

      const openButton = screen.getByText('Open');
      await user.click(openButton);

      // Wait for open animation to finish
      await waitFor(() => {
        expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
      });

      expect(screen.queryByTestId('popup')).not.to.equal(null);
    });

    it('does not get called on mount when not open', async () => {
      const onOpenChangeComplete = spy();

      render(() => (
        <PreviewCard.Root onOpenChangeComplete={onOpenChangeComplete}>
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup />
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      ));

      expect(onOpenChangeComplete.callCount).to.equal(0);
    });
  });
});

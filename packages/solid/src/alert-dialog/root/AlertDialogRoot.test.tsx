import { createRenderer, isJSDOM, popupConformanceTests } from '#test-utils';
import { AlertDialog } from '@msviderok/base-ui-solid/alert-dialog';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createSignal } from 'solid-js';
import { REASONS } from '../../utils/reasons';

describe('<AlertDialog.Root />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  popupConformanceTests({
    createComponent: (props) => (
      <AlertDialog.Root {...props.root}>
        <AlertDialog.Trigger {...props.trigger}>Open dialog</AlertDialog.Trigger>
        <AlertDialog.Portal {...props.portal}>
          <AlertDialog.Popup {...props.popup}>Dialog</AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    ),
    render: (...args) => render(...(args as Parameters<typeof render>)),
    triggerMouseAction: 'click',
    expectedPopupRole: 'alertdialog',
    expectedAriaHasPopupValue: 'dialog',
  });

  it('ARIA attributes', async () => {
    render(() => (
      <AlertDialog.Root open>
        <AlertDialog.Trigger />
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>title text</AlertDialog.Title>
            <AlertDialog.Description>description text</AlertDialog.Description>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    ));

    const popup = screen.queryByRole('alertdialog');
    expect(popup).not.to.equal(null);

    expect(screen.getByText('title text').getAttribute('id')).to.equal(
      popup?.getAttribute('aria-labelledby'),
    );
    expect(screen.getByText('description text').getAttribute('id')).to.equal(
      popup?.getAttribute('aria-describedby'),
    );
  });

  describe('prop: onOpenChange', () => {
    it('calls onOpenChange with the new open state', async () => {
      const handleOpenChange = spy();

      const { user } = render(() => (
        <AlertDialog.Root onOpenChange={handleOpenChange}>
          <AlertDialog.Trigger>Open</AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Popup>
              <AlertDialog.Close>Close</AlertDialog.Close>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      expect(handleOpenChange.callCount).to.equal(0);

      const openButton = screen.getByText('Open');
      await user.click(openButton);

      expect(handleOpenChange.callCount).to.equal(1);
      expect(handleOpenChange.firstCall.args[0]).to.equal(true);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(handleOpenChange.callCount).to.equal(2);
      expect(handleOpenChange.secondCall.args[0]).to.equal(false);
    });

    it('calls onOpenChange with the reason for change when clicked on trigger and close button', async () => {
      const handleOpenChange = spy();

      const { user } = render(() => (
        <AlertDialog.Root onOpenChange={handleOpenChange}>
          <AlertDialog.Trigger>Open</AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Popup>
              <AlertDialog.Close>Close</AlertDialog.Close>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      const openButton = screen.getByText('Open');
      await user.click(openButton);

      expect(handleOpenChange.callCount).to.equal(1);
      expect(handleOpenChange.firstCall.args[1].reason).to.equal(REASONS.triggerPress);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(handleOpenChange.callCount).to.equal(2);
      expect(handleOpenChange.secondCall.args[1].reason).to.equal(REASONS.closePress);
    });

    it('calls onOpenChange with the reason for change when pressed Esc while the dialog is open', async () => {
      const handleOpenChange = spy();

      const { user } = render(() => (
        <AlertDialog.Root defaultOpen onOpenChange={handleOpenChange}>
          <AlertDialog.Trigger>Open</AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Popup>
              <AlertDialog.Close>Close</AlertDialog.Close>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      await user.keyboard('[Escape]');

      expect(handleOpenChange.callCount).to.equal(1);
      expect(handleOpenChange.firstCall.args[1].reason).to.equal(REASONS.escapeKey);
    });

    it('does not close when the backdrop is clicked', async () => {
      const handleOpenChange = spy();

      const { user } = render(() => (
        <AlertDialog.Root defaultOpen onOpenChange={handleOpenChange}>
          <AlertDialog.Trigger>Open</AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Popup>
              <AlertDialog.Close>Close</AlertDialog.Close>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      await user.click(screen.getByRole('presentation', { hidden: true }));

      expect(handleOpenChange.callCount).to.equal(0);
      expect(screen.queryByRole('alertdialog')).not.to.equal(null);
    });
  });

  describe('prop: actionsRef', () => {
    it('unmounts the alert dialog when the `unmount` method is called', async () => {
      const actionsRef = {
        unmount: spy(),
        close: spy(),
      };

      const { user } = render(() => (
        <AlertDialog.Root
          actionsRef={actionsRef}
          onOpenChange={(open, details) => {
            details.preventUnmountOnClose();
          }}
        >
          <AlertDialog.Trigger>Open</AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Popup />
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      const trigger = screen.getByText('Open');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.to.equal(null);
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.to.equal(null);
      });

      actionsRef.unmount();

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).to.equal(null);
      });
    });
  });

  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = { payload: number | undefined };

    it('opens the alert dialog with any trigger', async () => {
      const { user } = render(() => (
        <AlertDialog.Root>
          <AlertDialog.Trigger>Trigger 1</AlertDialog.Trigger>
          <AlertDialog.Trigger>Trigger 2</AlertDialog.Trigger>
          <AlertDialog.Trigger>Trigger 3</AlertDialog.Trigger>

          <AlertDialog.Portal>
            <AlertDialog.Popup>
              Alert dialog content
              <AlertDialog.Close>Close</AlertDialog.Close>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Alert dialog content')).to.equal(null);

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).not.to.equal(null);
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).to.equal(null);
      });

      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).not.to.equal(null);
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).to.equal(null);
      });

      await user.click(trigger3);
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).not.to.equal(null);
      });
    });

    it('sets the payload and renders content based on its value', async () => {
      const { user } = render(() => (
        <AlertDialog.Root>
          {(data: NumberPayload) => (
            <>
              <AlertDialog.Trigger payload={1}>Trigger 1</AlertDialog.Trigger>
              <AlertDialog.Trigger payload={2}>Trigger 2</AlertDialog.Trigger>

              <AlertDialog.Portal>
                <AlertDialog.Popup>
                  <span data-testid="content">{data.payload}</span>
                  <AlertDialog.Close>Close</AlertDialog.Close>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            </>
          )}
        </AlertDialog.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('1');
      });

      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('2');
      });
    });

    it('reuses the popup DOM node when switching triggers', async () => {
      const { user } = render(() => (
        <AlertDialog.Root>
          {(data: NumberPayload) => (
            <>
              <AlertDialog.Trigger payload={1}>Trigger 1</AlertDialog.Trigger>
              <AlertDialog.Trigger payload={2}>Trigger 2</AlertDialog.Trigger>

              <AlertDialog.Portal>
                <AlertDialog.Popup data-testid="alert-dialog-popup">
                  <span>{data.payload}</span>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            </>
          )}
        </AlertDialog.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('alert-dialog-popup');

      await user.click(trigger2);
      expect(screen.getByTestId('alert-dialog-popup')).to.equal(popupElement);
    });

    it('synchronizes ARIA attributes on the active trigger', async () => {
      const { user } = render(() => (
        <AlertDialog.Root>
          <AlertDialog.Trigger>Trigger 1</AlertDialog.Trigger>
          <AlertDialog.Trigger>Trigger 2</AlertDialog.Trigger>

          <AlertDialog.Portal>
            <AlertDialog.Popup data-testid="alert-dialog-popup">
              Alert dialog content
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      expect(trigger1).to.have.attribute('aria-expanded', 'false');
      expect(trigger2).to.have.attribute('aria-expanded', 'false');

      await user.click(trigger1);

      const dialog = await screen.findByRole('alertdialog');
      const trigger1Controls = trigger1.getAttribute('aria-controls');
      expect(trigger1Controls).not.to.equal(null);
      expect(dialog.getAttribute('id')).to.equal(trigger1Controls);
      await waitFor(() => {
        expect(trigger1).to.have.attribute('aria-expanded', 'true');
      });
      expect(trigger2).to.have.attribute('aria-expanded', 'false');
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: number | undefined };

    it('opens the alert dialog with any trigger', async () => {
      const testDialog = AlertDialog.createHandle();
      const { user } = render(() => (
        <div>
          <AlertDialog.Trigger handle={testDialog}>Trigger 1</AlertDialog.Trigger>
          <AlertDialog.Trigger handle={testDialog}>Trigger 2</AlertDialog.Trigger>
          <AlertDialog.Trigger handle={testDialog}>Trigger 3</AlertDialog.Trigger>

          <AlertDialog.Root handle={testDialog}>
            <AlertDialog.Portal>
              <AlertDialog.Popup>
                Alert dialog content
                <AlertDialog.Close>Close</AlertDialog.Close>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Alert dialog content')).to.equal(null);

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).not.to.equal(null);
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).to.equal(null);
      });

      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).not.to.equal(null);
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).to.equal(null);
      });

      await user.click(trigger3);
      await waitFor(() => {
        expect(screen.queryByText('Alert dialog content')).not.to.equal(null);
      });
    });

    it('sets the payload and renders content based on its value', async () => {
      const testDialog = AlertDialog.createHandle<number>();
      const { user } = render(() => (
        <div>
          <AlertDialog.Trigger handle={testDialog} payload={1}>
            Trigger 1
          </AlertDialog.Trigger>
          <AlertDialog.Trigger handle={testDialog} payload={2}>
            Trigger 2
          </AlertDialog.Trigger>

          <AlertDialog.Root handle={testDialog}>
            {(data: NumberPayload) => (
              <AlertDialog.Portal>
                <AlertDialog.Popup>
                  <span data-testid="content">{data.payload}</span>
                  <AlertDialog.Close>Close</AlertDialog.Close>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            )}
          </AlertDialog.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('1');
      });

      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('2');
      });
    });

    it('reuses the popup DOM node when switching triggers', async () => {
      const testDialog = AlertDialog.createHandle<number>();
      const { user } = render(() => (
        <>
          <AlertDialog.Trigger handle={testDialog} payload={1}>
            Trigger 1
          </AlertDialog.Trigger>
          <AlertDialog.Trigger handle={testDialog} payload={2}>
            Trigger 2
          </AlertDialog.Trigger>

          <AlertDialog.Root handle={testDialog}>
            {(data: NumberPayload) => (
              <AlertDialog.Portal>
                <AlertDialog.Popup data-testid="alert-dialog-popup">
                  <span>{data.payload}</span>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            )}
          </AlertDialog.Root>
        </>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('alert-dialog-popup');

      await user.click(trigger2);
      expect(screen.getByTestId('alert-dialog-popup')).to.equal(popupElement);
    });
  });

  describe('imperative actions on the handle', () => {
    it('keeps the alert dialog open when the backdrop is clicked', async () => {
      const handle = AlertDialog.createHandle();

      const { user } = render(() => (
        <>
          <AlertDialog.Trigger handle={handle}>Open</AlertDialog.Trigger>
          <AlertDialog.Root handle={handle}>
            <AlertDialog.Portal>
              <AlertDialog.Popup>
                <AlertDialog.Close>Close</AlertDialog.Close>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      expect(await screen.findByRole('alertdialog')).not.to.equal(null);

      const backdrop = await screen.findByRole('presentation', { hidden: true });
      await user.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.to.equal(null);
      });
    });

    it('opens and closes the dialog', async () => {
      const dialog = AlertDialog.createHandle();
      render(() => (
        <div>
          <AlertDialog.Trigger handle={dialog} id="trigger">
            Trigger
          </AlertDialog.Trigger>
          <AlertDialog.Root handle={dialog}>
            <AlertDialog.Portal>
              <AlertDialog.Popup data-testid="content">Content</AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(screen.queryByRole('alertdialog')).to.equal(null);

      dialog.open('trigger');
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('Content');
      expect(trigger).to.have.attribute('aria-expanded', 'true');

      dialog.close();
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).to.equal(null);
      });

      expect(trigger).to.have.attribute('aria-expanded', 'false');
    });

    it('sets the payload assosiated with the trigger', async () => {
      const dialog = AlertDialog.createHandle<number>();
      render(() => (
        <div>
          <AlertDialog.Trigger handle={dialog} id="trigger1" payload={1}>
            Trigger 1
          </AlertDialog.Trigger>
          <AlertDialog.Trigger handle={dialog} id="trigger2" payload={2}>
            Trigger 2
          </AlertDialog.Trigger>
          <AlertDialog.Root handle={dialog}>
            {(data: { payload: number | undefined }) => (
              <AlertDialog.Portal>
                <AlertDialog.Popup data-testid="content">{data.payload}</AlertDialog.Popup>
              </AlertDialog.Portal>
            )}
          </AlertDialog.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByRole('alertdialog')).to.equal(null);

      dialog.open('trigger2');
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('2');
      expect(trigger2).to.have.attribute('aria-expanded', 'true');
      expect(trigger1).not.to.have.attribute('aria-expanded', 'true');

      dialog.close();
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).to.equal(null);
      });

      expect(trigger2).to.have.attribute('aria-expanded', 'false');
    });

    it('sets the payload programmatically', async () => {
      const dialog = AlertDialog.createHandle<number>();
      render(() => (
        <div>
          <AlertDialog.Trigger handle={dialog} id="trigger1" payload={1}>
            Trigger 1
          </AlertDialog.Trigger>
          <AlertDialog.Trigger handle={dialog} id="trigger2" payload={2}>
            Trigger 2
          </AlertDialog.Trigger>
          <AlertDialog.Root handle={dialog}>
            {(data: { payload: number | undefined }) => (
              <AlertDialog.Portal>
                <AlertDialog.Popup data-testid="content">{data.payload}</AlertDialog.Popup>
              </AlertDialog.Portal>
            )}
          </AlertDialog.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByRole('alertdialog')).to.equal(null);

      dialog.openWithPayload(8);
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('8');
      expect(trigger1).not.to.have.attribute('aria-expanded', 'true');
      expect(trigger2).not.to.have.attribute('aria-expanded', 'true');

      dialog.close();
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).to.equal(null);
      });
    });
  });

  describe.skipIf(isJSDOM)('modality', () => {
    it('makes other interactive elements on the page inert when a modal dialog is open', async () => {
      render(() => (
        <AlertDialog.Root defaultOpen>
          <AlertDialog.Trigger>Open Dialog</AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Popup>
              <AlertDialog.Close>Close Dialog</AlertDialog.Close>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      ));

      expect(screen.getByRole('presentation', { hidden: true })).not.to.equal(null);
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
            <AlertDialog.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <AlertDialog.Portal>
                <AlertDialog.Popup data-testid="popup" />
              </AlertDialog.Portal>
            </AlertDialog.Root>
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
            <AlertDialog.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <AlertDialog.Portal>
                <AlertDialog.Popup class="animation-test-indicator" data-testid="popup" />
              </AlertDialog.Portal>
            </AlertDialog.Root>
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
            <AlertDialog.Root open={open()} onOpenChangeComplete={onOpenChangeComplete}>
              <AlertDialog.Portal>
                <AlertDialog.Popup data-testid="popup" />
              </AlertDialog.Portal>
            </AlertDialog.Root>
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
            <AlertDialog.Root
              open={open()}
              onOpenChange={setOpen}
              onOpenChangeComplete={onOpenChangeComplete}
            >
              <AlertDialog.Portal>
                <AlertDialog.Popup class="animation-test-indicator" data-testid="popup" />
              </AlertDialog.Portal>
            </AlertDialog.Root>
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
  });
});

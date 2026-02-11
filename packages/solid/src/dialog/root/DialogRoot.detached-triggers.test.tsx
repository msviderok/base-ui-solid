import { createRenderer, isJSDOM } from '#test-utils';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';

describe('<Dialog.Root />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = { payload: number | undefined };

    it('opens the dialog with any trigger', async () => {
      const { user } = render(() => (
        <Dialog.Root>
          <Dialog.Trigger>Trigger 1</Dialog.Trigger>
          <Dialog.Trigger>Trigger 2</Dialog.Trigger>
          <Dialog.Trigger>Trigger 3</Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Popup>
              Dialog Content
              <Dialog.Close>Close</Dialog.Close>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Dialog Content')).to.equal(null);

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.to.equal(null);
      });

      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).to.equal(null);
      });

      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.to.equal(null);
      });

      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).to.equal(null);
      });

      await user.click(trigger3);
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.to.equal(null);
      });
    });

    it('sets the payload and renders content based on its value', async () => {
      const { user } = render(() => (
        <Dialog.Root>
          {(data: NumberPayload) => (
            <>
              <Dialog.Trigger payload={1}>Trigger 1</Dialog.Trigger>
              <Dialog.Trigger payload={2}>Trigger 2</Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Popup>
                  <span data-testid="content">{data.payload}</span>
                  <Dialog.Close>Close</Dialog.Close>
                </Dialog.Popup>
              </Dialog.Portal>
            </>
          )}
        </Dialog.Root>
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
        <Dialog.Root>
          {(data: NumberPayload) => (
            <>
              <Dialog.Trigger payload={1}>Trigger 1</Dialog.Trigger>
              <Dialog.Trigger payload={2}>Trigger 2</Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Popup data-testid="dialog-popup">
                  <span>{data.payload}</span>
                </Dialog.Popup>
              </Dialog.Portal>
            </>
          )}
        </Dialog.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('dialog-popup');

      await user.click(trigger2);
      expect(screen.getByTestId('dialog-popup')).to.equal(popupElement);
    });

    it('synchronizes ARIA attributes on the active trigger', async () => {
      const { user } = render(() => (
        <Dialog.Root>
          <Dialog.Trigger>Trigger 1</Dialog.Trigger>
          <Dialog.Trigger>Trigger 2</Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Popup data-testid="dialog-popup">Dialog Content</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      expect(trigger1).to.have.attribute('aria-expanded', 'false');
      expect(trigger2).to.have.attribute('aria-expanded', 'false');

      await user.click(trigger1);

      const dialog = await screen.findByRole('dialog');
      const trigger1Controls = trigger1.getAttribute('aria-controls');
      expect(trigger1Controls).not.to.equal(null);
      expect(dialog.getAttribute('id')).to.equal(trigger1Controls);
      await waitFor(() => {
        expect(trigger1).to.have.attribute('aria-expanded', 'true');
      });
      expect(trigger2).to.have.attribute('aria-expanded', 'false');
    });

    it('sets the payload when opening programmatically with a controlled triggerId', async () => {
      function App() {
        const [open, setOpen] = createSignal(false);
        const [triggerId, setTriggerId] = createSignal<string | null>(null);

        return (
          <div>
            <Dialog.Root open={open()} triggerId={triggerId()}>
              {(data: NumberPayload) => (
                <>
                  <Dialog.Trigger id="trigger-1" payload={1}>
                    One
                  </Dialog.Trigger>
                  <Dialog.Trigger id="trigger-2" payload={2}>
                    Two
                  </Dialog.Trigger>

                  <Dialog.Portal>
                    <Dialog.Popup>
                      <span data-testid="content">{data.payload}</span>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </>
              )}
            </Dialog.Root>

            <button
              type="button"
              onClick={() => {
                setTriggerId('trigger-2');
                setOpen(true);
              }}
            >
              Open programmatically
            </button>
          </div>
        );
      }

      const { user } = render(() => <App />);

      const openButton = screen.getByRole('button', { name: 'Open programmatically' });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('2');
      });
    });

    it('keeps the payload reactive', async () => {
      function App() {
        const [payloads, setPayloads] = createSignal([1, 2]);

        return (
          <div>
            <Dialog.Root>
              {(data: NumberPayload) => (
                <>
                  <Dialog.Trigger id="trigger-1" payload={payloads()[0]}>
                    Dialog 1
                  </Dialog.Trigger>
                  <Dialog.Trigger id="trigger-2" payload={payloads()[1]}>
                    Dialog 2
                  </Dialog.Trigger>

                  <Dialog.Portal>
                    <Dialog.Popup>
                      <span data-testid="content">{data.payload}</span>
                      <button type="button" onClick={() => setPayloads([8, 16])}>
                        Update payloads
                      </button>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </>
              )}
            </Dialog.Root>
          </div>
        );
      }

      const { user } = render(() => <App />);

      const trigger1 = screen.getByRole('button', { name: 'Dialog 1' });
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('1');
      });

      const updateButton = screen.getByRole('button', { name: 'Update payloads' });
      await user.click(updateButton);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('8');
      });
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: number | undefined };

    it('opens the dialog with any trigger', async () => {
      const testDialog = Dialog.createHandle();
      const { user } = render(() => (
        <div>
          <Dialog.Trigger handle={testDialog}>Trigger 1</Dialog.Trigger>
          <Dialog.Trigger handle={testDialog}>Trigger 2</Dialog.Trigger>
          <Dialog.Trigger handle={testDialog}>Trigger 3</Dialog.Trigger>

          <Dialog.Root handle={testDialog}>
            <Dialog.Portal>
              <Dialog.Popup>
                Dialog Content
                <Dialog.Close>Close</Dialog.Close>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Dialog Content')).to.equal(null);

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.to.equal(null);
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).to.equal(null);
      });

      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.to.equal(null);
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).to.equal(null);
      });

      await user.click(trigger3);
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).not.to.equal(null);
      });
    });

    it('sets the payload and renders content based on its value', async () => {
      const testDialog = Dialog.createHandle<number>();
      const { user } = render(() => (
        <div>
          <Dialog.Trigger handle={testDialog} payload={1}>
            Trigger 1
          </Dialog.Trigger>
          <Dialog.Trigger handle={testDialog} payload={2}>
            Trigger 2
          </Dialog.Trigger>

          <Dialog.Root handle={testDialog}>
            {(data: NumberPayload) => (
              <Dialog.Portal>
                <Dialog.Popup>
                  <span data-testid="content">{data.payload}</span>
                  <Dialog.Close>Close</Dialog.Close>
                </Dialog.Popup>
              </Dialog.Portal>
            )}
          </Dialog.Root>
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
      const testDialog = Dialog.createHandle<number>();
      const { user } = render(() => (
        <>
          <Dialog.Trigger handle={testDialog} payload={1}>
            Trigger 1
          </Dialog.Trigger>
          <Dialog.Trigger handle={testDialog} payload={2}>
            Trigger 2
          </Dialog.Trigger>

          <Dialog.Root handle={testDialog}>
            {(data: NumberPayload) => (
              <Dialog.Portal>
                <Dialog.Popup data-testid="dialog-popup">
                  <span>{data.payload}</span>
                </Dialog.Popup>
              </Dialog.Portal>
            )}
          </Dialog.Root>
        </>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('dialog-popup');

      await user.click(trigger2);
      expect(screen.getByTestId('dialog-popup')).to.equal(popupElement);
    });

    it('keeps the payload reactive', async () => {
      type NumberAccessorPayload = { payload: (() => number) | undefined };
      const testDialog = Dialog.createHandle<() => number>();
      function Triggers() {
        // Setting up triggers in a separate component so payload is in their local state
        // and updating it does not cause the Dialog.Root to re-render automatically.
        // This verifies that the payload is reactive and not only set on mount or on trigger click.
        const [payloads, setPayloads] = createSignal([1, 2]);

        return (
          <div>
            <Dialog.Trigger id="trigger-1" payload={() => payloads()[0]} handle={testDialog}>
              Dialog 1
            </Dialog.Trigger>
            <Dialog.Trigger id="trigger-2" payload={() => payloads()[1]} handle={testDialog}>
              Dialog 2
            </Dialog.Trigger>
            <button type="button" onClick={() => setPayloads([8, 16])}>
              Update payloads
            </button>
          </div>
        );
      }

      function App() {
        return (
          <div>
            <Triggers />
            <Dialog.Root modal={false} disablePointerDismissal={true} handle={testDialog}>
              {(data: NumberAccessorPayload) => (
                <Dialog.Portal>
                  <Dialog.Popup>
                    <span data-testid="content">{data.payload?.()}</span>
                  </Dialog.Popup>
                </Dialog.Portal>
              )}
            </Dialog.Root>
          </div>
        );
      }

      const { user } = render(() => <App />);

      const trigger1 = screen.getByRole('button', { name: 'Dialog 1' });
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('1');
      });

      const updateButton = screen.getByRole('button', { name: 'Update payloads' });
      await user.click(updateButton);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('8');
      });
    });
  });

  describe('imperative actions on the handle', () => {
    it('opens and closes the dialog', async () => {
      const dialog = Dialog.createHandle();
      render(() => (
        <div>
          <Dialog.Trigger handle={dialog} id="trigger">
            Trigger
          </Dialog.Trigger>
          <Dialog.Root handle={dialog}>
            <Dialog.Portal>
              <Dialog.Popup data-testid="content">Content</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(screen.queryByRole('dialog')).to.equal(null);

      dialog.open('trigger');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('Content');
      expect(trigger).to.have.attribute('aria-expanded', 'true');

      dialog.close();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).to.equal(null);
      });

      expect(trigger).to.have.attribute('aria-expanded', 'false');
    });

    it('sets the payload assosiated with the trigger', async () => {
      const dialog = Dialog.createHandle<number>();
      render(() => (
        <div>
          <Dialog.Trigger handle={dialog} id="trigger1" payload={1}>
            Trigger 1
          </Dialog.Trigger>
          <Dialog.Trigger handle={dialog} id="trigger2" payload={2}>
            Trigger 2
          </Dialog.Trigger>
          <Dialog.Root handle={dialog}>
            {(data: { payload: number | undefined }) => (
              <Dialog.Portal>
                <Dialog.Popup data-testid="content">{data.payload}</Dialog.Popup>
              </Dialog.Portal>
            )}
          </Dialog.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByRole('dialog')).to.equal(null);

      dialog.open('trigger2');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('2');
      expect(trigger2).to.have.attribute('aria-expanded', 'true');
      expect(trigger1).not.to.have.attribute('aria-expanded', 'true');

      dialog.close();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).to.equal(null);
      });

      expect(trigger2).to.have.attribute('aria-expanded', 'false');
    });

    it('sets the payload programmatically', async () => {
      const dialog = Dialog.createHandle<number>();
      render(() => (
        <div>
          <Dialog.Trigger handle={dialog} id="trigger1" payload={1}>
            Trigger 1
          </Dialog.Trigger>
          <Dialog.Trigger handle={dialog} id="trigger2" payload={2}>
            Trigger 2
          </Dialog.Trigger>
          <Dialog.Root handle={dialog}>
            {(data: { payload: number | undefined }) => (
              <Dialog.Portal>
                <Dialog.Popup data-testid="content">{data.payload}</Dialog.Popup>
              </Dialog.Portal>
            )}
          </Dialog.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByRole('dialog')).to.equal(null);

      dialog.openWithPayload(8);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('8');
      expect(trigger1).not.to.have.attribute('aria-expanded', 'true');
      expect(trigger2).not.to.have.attribute('aria-expanded', 'true');

      dialog.close();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).to.equal(null);
      });
    });
  });
});

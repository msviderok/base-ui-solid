import {
  createRenderer,
  flushMicrotasks,
  isJSDOM,
  mockAnimationsFinished,
  popupConformanceTests,
} from '#test-utils';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import { Menu } from '@msviderok/base-ui-solid/menu';
import { Select } from '@msviderok/base-ui-solid/select';
import { defaultProps } from '@msviderok/base-ui-solid/solid-helpers';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import {
  createSignal,
  Show,
  mergeProps as solidMergeProps,
  splitProps,
  type Component,
  type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { REASONS } from '../../utils/reasons';

describe('<Dialog.Root />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  popupConformanceTests({
    createComponent: (props) => (
      <Dialog.Root {...props.root}>
        <Dialog.Trigger {...props.trigger}>Open dialog</Dialog.Trigger>
        <Dialog.Portal {...props.portal}>
          <Dialog.Popup {...props.popup}>Dialog</Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    ),
    render: (...args) => render(...(args as Parameters<typeof render>)),
    triggerMouseAction: 'click',
    expectedPopupRole: 'dialog',
  });

  describe.for([
    { name: 'contained triggers', Component: ContainedTriggerDialog },
    { name: 'detached triggers', Component: DetachedTriggerDialog },
    { name: 'multiple detached triggers', Component: MultipleDetachedTriggersDialog },
  ])('when using $name', ({ Component: TestDialog }) => {
    it('ARIA attributes', async () => {
      render(() => (
        <TestDialog
          rootProps={{ modal: false, open: true }}
          popupProps={{
            get children() {
              return (
                <>
                  <Dialog.Title>title text</Dialog.Title>
                  <Dialog.Description>description text</Dialog.Description>
                </>
              );
            },
          }}
          includeBackdrop
        />
      ));

      const popup = screen.queryByRole('dialog');
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
          <TestDialog rootProps={{ onOpenChange: handleOpenChange }} />
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
          <TestDialog rootProps={{ onOpenChange: handleOpenChange }} />
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
          <TestDialog rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }} />
        ));

        await user.keyboard('[Escape]');

        expect(handleOpenChange.callCount).to.equal(1);
        expect(handleOpenChange.firstCall.args[1].reason).to.equal(REASONS.escapeKey);
      });

      it('calls onOpenChange with the reason for change when user clicks backdrop while the modal dialog is open', async () => {
        const handleOpenChange = spy();

        const { user } = render(() => (
          <TestDialog rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }} />
        ));

        await user.click(screen.getByRole('presentation', { hidden: true }));

        expect(handleOpenChange.callCount).to.equal(1);
        expect(handleOpenChange.firstCall.args[1].reason).to.equal(REASONS.outsidePress);
      });

      it('calls onOpenChange with the reason for change when user clicks outside while the non-modal dialog is open', async () => {
        const handleOpenChange = spy();

        const { user } = render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: false }}
          />
        ));

        await user.click(document.body);

        expect(handleOpenChange.callCount).to.equal(1);
        expect(handleOpenChange.firstCall.args[1].reason).to.equal(REASONS.outsidePress);
      });

      describe.skipIf(isJSDOM)('clicks on user backdrop', () => {
        it('detects clicks on user backdrop', async () => {
          const handleOpenChange = spy();

          const { user } = render(() => (
            <TestDialog
              rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }}
              popupProps={{ style: { position: 'fixed', 'z-index': 10 } }}
              includeBackdrop
            />
          ));

          await user.click(screen.getByTestId('backdrop'));

          expect(handleOpenChange.callCount).to.equal(1);
          expect(handleOpenChange.firstCall.args[1].reason).to.equal(REASONS.outsidePress);
        });

        it('does not change open state on non-main button clicks', async () => {
          const handleOpenChange = spy();

          const { user } = render(() => (
            <TestDialog
              rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }}
              includeBackdrop
            />
          ));

          const backdrop = screen.getByTestId('backdrop');
          await user.pointer([{ target: backdrop }, { keys: '[MouseRight]', target: backdrop }]);

          expect(handleOpenChange.callCount).to.equal(0);
        });
      });

      it('cancel() prevents opening while uncontrolled', async () => {
        const { user } = render(() => (
          <TestDialog
            rootProps={{
              onOpenChange: (nextOpen, eventDetails) => {
                if (nextOpen) {
                  eventDetails.cancel();
                }
              },
            }}
          />
        ));

        const openButton = screen.getByText('Open');
        await user.click(openButton);
        await flushMicrotasks();

        expect(screen.queryByRole('dialog')).to.equal(null);
      });
    });

    describe('prop: modal', () => {
      it('makes other interactive elements on the page inert when a modal dialog is open', async () => {
        render(() => <TestDialog rootProps={{ defaultOpen: true, modal: true }} />);

        expect(screen.getByRole('presentation', { hidden: true })).not.to.equal(null);
      });

      it('does not make other interactive elements on the page inert when a non-modal dialog is open', async () => {
        render(() => <TestDialog rootProps={{ defaultOpen: true, modal: false }} />);

        expect(screen.queryByRole('presentation')).to.equal(null);
      });
    });

    describe('prop: disablePointerDismissal', () => {
      (
        [
          [true, false],
          [false, true],
          [undefined, true],
        ] as const
      ).forEach(([disablePointerDismissal, expectDismissed]) => {
        it(`${expectDismissed ? 'closes' : 'does not close'} the dialog when clicking outside if disablePointerDismissal=${disablePointerDismissal}`, async () => {
          const handleOpenChange = spy();

          render(() => (
            <div data-testid="outside">
              <TestDialog
                rootProps={{
                  defaultOpen: true,
                  onOpenChange: handleOpenChange,
                  disablePointerDismissal,
                  modal: false,
                }}
              />
            </div>
          ));

          const outside = screen.getByTestId('outside');

          fireEvent.mouseDown(outside);
          fireEvent.click(outside);
          expect(handleOpenChange.calledOnce).to.equal(expectDismissed);

          if (expectDismissed) {
            expect(screen.queryByRole('dialog')).to.equal(null);
          } else {
            expect(screen.queryByRole('dialog')).not.to.equal(null);
          }
        });
      });
    });

    describe('outside press event with backdrops', () => {
      it('uses intentional outside press with user backdrop (mouse): closes on click, not on mousedown', async () => {
        const handleOpenChange = spy();

        render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: false }}
            includeBackdrop
          />
        ));

        const backdrop = screen.getByTestId('backdrop');

        fireEvent.mouseDown(backdrop);
        expect(screen.queryByRole('dialog')).not.to.equal(null);
        expect(handleOpenChange.callCount).to.equal(0);

        fireEvent.click(backdrop);
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).to.equal(null);
        });
        expect(handleOpenChange.callCount).to.equal(1);
      });

      it('uses intentional outside press with internal backdrop (modal=true): closes on click, not on mousedown', async () => {
        const handleOpenChange = spy();

        render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: true }}
          />
        ));

        const internalBackdrop = screen.getByRole('presentation', { hidden: true });

        fireEvent.mouseDown(internalBackdrop);
        expect(screen.queryByRole('dialog')).not.to.equal(null);
        expect(handleOpenChange.callCount).to.equal(0);

        fireEvent.click(internalBackdrop);
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).to.equal(null);
        });
        expect(handleOpenChange.callCount).to.equal(1);
      });
    });

    it.skipIf(isJSDOM)('waits for the exit transition to finish before unmounting', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const notifyTransitionEnd = spy();

      function TransitionTest(props: { open: boolean }) {
        return (
          <>
            <TestDialog
              rootProps={{ open: props.open, modal: false }}
              portalProps={{ keepMounted: true }}
              popupProps={{
                class: 'dialog',
                onTransitionEnd: notifyTransitionEnd,
                children: null,
              }}
            />
          </>
        );
      }

      const [open, setOpen] = createSignal(true);
      render(() => <TransitionTest open={open()} />);

      const popup = screen.getByRole('dialog');
      const animation = mockAnimationsFinished(popup);

      setOpen(false);
      expect(screen.queryByRole('dialog')).to.equal(popup);

      await waitFor(() => {
        expect(popup).to.have.attribute('data-ending-style');
      });

      fireEvent.transitionEnd(popup);
      animation.finish();

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).to.equal(null);
      });

      expect(notifyTransitionEnd.callCount).to.equal(1);
    });

    describe('prop: modal', () => {
      it('should render an internal backdrop when `true`', async () => {
        const { user } = render(() => (
          <div>
            <TestDialog rootProps={{ modal: true }} />
            <button>Outside</button>
          </div>
        ));

        const trigger = screen.getByTestId('trigger');

        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        const popup = screen.getByRole('dialog');

        // focus guard -> internal backdrop
        expect(popup.previousElementSibling?.previousElementSibling).to.have.attribute(
          'role',
          'presentation',
        );
      });

      it('should not render an internal backdrop when `false`', async () => {
        const { user } = render(() => (
          <div>
            <TestDialog rootProps={{ modal: false }} />
            <button>Outside</button>
          </div>
        ));

        const trigger = screen.getByTestId('trigger');

        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        const popup = screen.getByRole('dialog');

        // focus guard -> internal backdrop
        expect(popup.previousElementSibling?.previousElementSibling).to.equal(null);
      });
    });

    it('does not dismiss previous modal dialog when clicking new modal dialog', async () => {
      function App() {
        const [openNested, setOpenNested] = createSignal(false);
        const [openNested2, setOpenNested2] = createSignal(false);

        return (
          <div>
            <TestDialog
              triggerProps={{ children: 'Open base' }}
              popupProps={{
                children: <button onClick={() => setOpenNested(true)}>Open nested 1</button>,
              }}
            />
            <TestDialog
              rootProps={{ open: openNested(), onOpenChange: setOpenNested }}
              popupProps={{
                children: <button onClick={() => setOpenNested2(true)}>Open nested 2</button>,
              }}
            />
            <TestDialog
              rootProps={{ open: openNested2(), onOpenChange: setOpenNested2 }}
              popupProps={{ children: 'Final nested' }}
            />
          </div>
        );
      }

      const { user } = render(() => <App />);

      const trigger = screen.getByRole('button', { name: 'Open base' });
      await user.click(trigger);

      const nestedButton1 = screen.getByRole('button', { name: 'Open nested 1' });
      await user.click(nestedButton1);

      const nestedButton2 = screen.getByRole('button', { name: 'Open nested 2' });
      await user.click(nestedButton2);

      const finalDialog = screen.getByText('Final nested');

      expect(finalDialog).not.to.equal(null);
    });

    it('dismisses non-nested dialogs one by one', async () => {
      function App() {
        const [openNested, setOpenNested] = createSignal(false);
        const [openNested2, setOpenNested2] = createSignal(false);

        return (
          <div>
            <TestDialog
              triggerProps={{ children: 'Open base' }}
              popupProps={
                {
                  'data-testid': 'level-1',
                  get children() {
                    return <button onClick={() => setOpenNested(true)}>Open nested 1</button>;
                  },
                } as Dialog.Popup.Props
              }
            />
            <TestDialog
              rootProps={{ open: openNested(), onOpenChange: setOpenNested }}
              popupProps={
                {
                  'data-testid': 'level-2',
                  get children() {
                    return <button onClick={() => setOpenNested2(true)}>Open nested 2</button>;
                  },
                } as Dialog.Popup.Props
              }
            />
            <TestDialog
              rootProps={{ open: openNested2(), onOpenChange: setOpenNested2 }}
              popupProps={
                { 'data-testid': 'level-3', children: 'Final nested' } as Dialog.Popup.Props
              }
            />
          </div>
        );
      }

      render(() => <App />);

      const trigger = screen.getByRole('button', { name: 'Open base' });
      fireEvent.click(trigger);

      const nestedButton1 = screen.getByRole('button', { name: 'Open nested 1' });
      fireEvent.click(nestedButton1);

      const nestedButton2 = screen.getByRole('button', { name: 'Open nested 2' });
      fireEvent.click(nestedButton2);

      const backdrops = Array.from(document.querySelectorAll('[role="presentation"]'));
      fireEvent.click(backdrops[backdrops.length - 1]);

      await waitFor(() => {
        expect(screen.queryByTestId('level-3')).to.equal(null);
      });

      fireEvent.click(backdrops[backdrops.length - 2]);

      await waitFor(() => {
        expect(screen.queryByTestId('level-2')).to.equal(null);
      });

      fireEvent.click(backdrops[backdrops.length - 3]);

      await waitFor(() => {
        expect(screen.queryByTestId('level-1')).to.equal(null);
      });
    });

    describe.skipIf(isJSDOM)('nested popups', () => {
      it('should not dismiss the dialog when dismissing outside a nested modal menu', async () => {
        const { user } = render(() => (
          <TestDialog
            popupProps={{
              children: (
                <Menu.Root>
                  <Menu.Trigger>Open menu</Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner data-testid="menu-positioner">
                      <Menu.Popup>
                        <Menu.Item>Item</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              ),
            }}
          />
        ));

        const dialogTrigger = screen.getByRole('button', { name: 'Open' });
        await user.click(dialogTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        const menuTrigger = screen.getByRole('button', { name: 'Open menu' });

        await user.click(menuTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.to.equal(null);
        });

        const menuPositioner = screen.getByTestId('menu-positioner');
        const menuInternalBackdrop = menuPositioner.previousElementSibling as HTMLElement;

        await user.click(menuInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('menu')).to.equal(null);
        });
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        const dialogPopup = screen.getByTestId('dialog-popup');
        const dialogInternalBackdrop = dialogPopup.previousElementSibling
          ?.previousElementSibling as HTMLElement;

        await user.click(dialogInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).to.equal(null);
        });
      });

      it('should not dismiss the dialog when dismissing outside a nested select popup', async () => {
        const { user } = render(() => (
          <TestDialog
            popupProps={{
              children: (
                <Select.Root>
                  <Select.Trigger data-testid="select-trigger">Open select</Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner data-testid="select-positioner">
                      <Select.Popup>
                        <Select.Item>Item</Select.Item>
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              ),
            }}
          />
        ));

        const dialogTrigger = screen.getByRole('button', { name: 'Open' });
        await user.click(dialogTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        const selectTrigger = screen.getByTestId('select-trigger');

        await user.click(selectTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('listbox')).not.to.equal(null);
        });

        const selectPositioner = screen.getByTestId('select-positioner');
        const selectInternalBackdrop = selectPositioner.previousElementSibling as HTMLElement;

        await user.click(selectInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('listbox')).to.equal(null);
        });
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        const dialogPopup = screen.getByTestId('dialog-popup');
        const dialogInternalBackdrop = dialogPopup.previousElementSibling
          ?.previousElementSibling as HTMLElement;

        await user.click(dialogInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).to.equal(null);
        });
      });

      it('should not close the parent menu when Escape is pressed in a nested dialog', async () => {
        const { user } = render(() => (
          <Menu.Root>
            <Menu.Trigger>Open menu</Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <TestDialog
                    triggerProps={{ children: 'Open dialog' }}
                    triggerWrapper={(trigger) => (
                      <Menu.Item
                        closeOnClick={false}
                        render={{ component: trigger }}
                        nativeButton
                      />
                    )}
                  />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ));

        const menuTrigger = screen.getByRole('button', { name: 'Open menu' });
        await user.click(menuTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.to.equal(null);
        });

        const dialogTrigger = screen.getByRole('menuitem', { name: 'Open dialog' });
        await user.click(dialogTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        await user.keyboard('[Escape]');

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).to.equal(null);
        });
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.to.equal(null);
        });
      });
    });

    describe('prop: actionsRef', () => {
      it('unmounts the dialog when the `unmount` method is called', async () => {
        const actionsRef = {
          current: {
            unmount: spy(),
            close: spy(),
          },
        };

        const { user } = render(() => (
          <TestDialog
            rootProps={{
              actionsRef,
              onOpenChange: (open, details) => {
                details.preventUnmountOnClose();
              },
            }}
          />
        ));

        const trigger = screen.getByRole('button', { name: 'Open' });
        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.to.equal(null);
        });

        actionsRef.current.unmount();

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).to.equal(null);
        });
      });
    });

    describe.skipIf(isJSDOM)('pointerdown removal', () => {
      it('moves focus to the popup when a focused child is removed on pointerdown and outside press still dismisses', async () => {
        function Test() {
          const [showButton, setShowButton] = createSignal(true);
          return (
            <TestDialog
              rootProps={{ defaultOpen: true, modal: 'trap-focus' }}
              popupProps={{
                get children() {
                  return (
                    <>
                      {showButton() && (
                        <button data-testid="remove" onPointerDown={() => setShowButton(false)}>
                          Remove on pointer down
                        </button>
                      )}
                    </>
                  );
                },
              }}
            />
          );
        }

        const { user } = render(() => <Test />);

        const removeButton = screen.getByTestId('remove');
        await waitFor(() => {
          expect(removeButton).toHaveFocus();
        });
        fireEvent.pointerDown(removeButton);

        const popup = screen.getByTestId('dialog-popup');
        await waitFor(() => {
          expect(popup).toHaveFocus();
        });

        await user.click(document.body);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).to.equal(null);
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
              <button onClick={() => setOpen(false)}>Close externally</button>
              <TestDialog rootProps={{ open: open(), onOpenChangeComplete }} />
            </div>
          );
        }

        const { user } = render(() => <Test />);

        const closeButton = screen.getByText('Close externally');
        await user.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).to.equal(null);
        });

        expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
        expect(onOpenChangeComplete.lastCall.args[0]).to.equal(false);
      });

      it('is called on close when the exit animation finishes', async () => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

        const onOpenChangeComplete = spy();

        function Test() {
          const [open, setOpen] = createSignal(true);

          return (
            <div>
              <button onClick={() => setOpen(false)}>Close externally</button>
              <TestDialog
                rootProps={{ open: open(), onOpenChangeComplete }}
                popupProps={{
                  class: 'animation-test-indicator',
                }}
              />
            </div>
          );
        }

        const { user } = render(() => <Test />);

        expect(screen.getByTestId('dialog-popup')).not.to.equal(null);

        // Wait for open animation to finish
        await waitFor(() => {
          expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
        });

        const popup = screen.getByTestId('dialog-popup');
        const animation = mockAnimationsFinished(popup);
        const closeButton = screen.getByText('Close externally');
        await user.click(closeButton);

        await waitFor(() => {
          expect(popup).to.have.attribute('data-ending-style');
        });

        animation.finish();

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).to.equal(null);
        });

        expect(onOpenChangeComplete.lastCall.args[0]).to.equal(false);
      });

      it('is called on open when there is no enter animation defined', async () => {
        const onOpenChangeComplete = spy();

        function Test() {
          const [open, setOpen] = createSignal(false);
          return (
            <div>
              <button onClick={() => setOpen(true)}>Open externally</button>
              <TestDialog rootProps={{ open: open(), onOpenChangeComplete }} />
            </div>
          );
        }

        const { user } = render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).not.to.equal(null);
        });

        expect(onOpenChangeComplete.callCount).to.equal(1);
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
              <button onClick={() => setOpen(true)}>Open externally</button>
              <TestDialog
                rootProps={{ open: open(), onOpenChange: setOpen, onOpenChangeComplete }}
                popupProps={{
                  class: 'animation-test-indicator',
                }}
              />
            </div>
          );
        }

        const { user } = render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        // Wait for open animation to finish
        await waitFor(() => {
          expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
        });

        expect(screen.queryByTestId('dialog-popup')).not.to.equal(null);
      });

      it('waits for a restarted enter animation to finish', async () => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

        const onOpenChangeComplete = spy();

        function Test() {
          const style = `
            @keyframes test-enter-a {
              from {
                opacity: 0;
              }
            }

            @keyframes test-enter-b {
              from {
                opacity: 0;
              }
            }

            .animation-test-indicator.animation-a[data-open] {
              animation: test-enter-a 50ms linear;
            }

            .animation-test-indicator.animation-b[data-open] {
              animation: test-enter-b 50ms linear;
            }
          `;

          const [open, setOpen] = createSignal(false);
          const [variant, setVariant] = createSignal<'a' | 'b'>('a');

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              <button onClick={() => setOpen(true)}>Open externally</button>
              <button onClick={() => setVariant((v) => (v === 'a' ? 'b' : 'a'))}>
                Swap animation
              </button>
              <TestDialog
                rootProps={{ open: open(), onOpenChange: setOpen, onOpenChangeComplete }}
                popupProps={{
                  class: `animation-test-indicator animation-${variant()}`,
                }}
              />
            </div>
          );
        }

        const { user } = render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        const popup = screen.getByTestId('dialog-popup');
        await waitFor(() => {
          expect(popup.getAnimations().length).not.to.equal(0);
        });

        const swapButton = screen.getByText('Swap animation');
        await user.click(swapButton);

        await flushMicrotasks();
        expect(onOpenChangeComplete.callCount).to.equal(0);

        await waitFor(() => {
          expect(onOpenChangeComplete.callCount).to.equal(1);
          expect(onOpenChangeComplete.firstCall.args[0]).to.equal(true);
        });
      });

      it('does not get called on open when dismissed during the enter animation', async () => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

        const onOpenChangeComplete = spy();

        function Test() {
          const style = `
            .animation-test-indicator {
              opacity: 0;
              transition: opacity 200ms linear;
            }

            .animation-test-indicator[data-open] {
              opacity: 1;
            }

            .animation-test-indicator[data-open][data-starting-style] {
              opacity: 0;
            }

            .animation-test-indicator[data-ending-style] {
              opacity: 0;
            }
          `;

          const [open, setOpen] = createSignal(false);

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              <button onClick={() => setOpen(true)}>Open externally</button>
              <TestDialog
                rootProps={{ open: open(), onOpenChange: setOpen, onOpenChangeComplete }}
                popupProps={{
                  class: 'animation-test-indicator',
                }}
              />
            </div>
          );
        }

        const { user } = render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).not.to.equal(null);
        });

        const popup = screen.getByTestId('dialog-popup');
        await waitFor(() => {
          const animations = popup.getAnimations();
          expect(animations.length).not.to.equal(0);
          expect(animations.some((anim) => anim.playState !== 'finished')).to.equal(true);
        });

        await user.click(document.body);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).to.equal(null);
        });

        expect(onOpenChangeComplete.callCount).to.equal(1);
        expect(onOpenChangeComplete.firstCall.args[0]).to.equal(false);
      });

      it('does not get called on mount when not open', async () => {
        const onOpenChangeComplete = spy();

        render(() => <TestDialog rootProps={{ onOpenChangeComplete }} />);

        expect(onOpenChangeComplete.callCount).to.equal(0);
      });
    });
  });
});

type TestDialogProps = {
  rootProps?: Omit<Dialog.Root.Props, 'children'>;
  triggerProps?: Dialog.Trigger.Props;
  portalProps?: Dialog.Portal.Props;
  popupProps?: Dialog.Popup.Props;
  omitTrigger?: boolean;
  includeBackdrop?: boolean;
  triggerWrapper?: (trigger: Component) => JSX.Element;
};

function ContainedTriggerDialog(componentProps: TestDialogProps) {
  const props = defaultProps(componentProps, {
    omitTrigger: false,
    includeBackdrop: false,
    triggerWrapper: (trigger) => <Dynamic component={trigger} />,
  });

  const [localTriggerProps, restTriggerProps] = splitProps(props.triggerProps ?? {}, ['children']);
  const [localPopupProps, restPopupProps] = splitProps(props.popupProps ?? {}, ['children']);
  const [localPortalProps, restPortalProps] = splitProps(props.portalProps ?? {}, ['children']);

  return (
    <Dialog.Root {...props.rootProps}>
      <Show when={!props.omitTrigger}>
        {props.triggerWrapper((p) => (
          <Dialog.Trigger {...p} data-testid="trigger" {...restTriggerProps}>
            {localTriggerProps.children ?? 'Open'}
          </Dialog.Trigger>
        ))}
      </Show>
      <Dialog.Portal {...restPortalProps}>
        {localPortalProps.children ?? (
          <>
            <Show when={props.includeBackdrop}>
              <Dialog.Backdrop
                data-testid="backdrop"
                style={{ position: 'fixed', 'z-index': 10, inset: 0 }}
              />
            </Show>
            <Dialog.Popup
              data-testid="dialog-popup"
              style={{ position: 'fixed', 'z-index': 10 }}
              {...restPopupProps}
            >
              {localPopupProps.children ?? (
                <>
                  <p>Dialog content</p>
                  <Dialog.Close>Close</Dialog.Close>
                </>
              )}
            </Dialog.Popup>
          </>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetachedTriggerDialog(componentProps: Omit<TestDialogProps, 'omitTrigger'>) {
  const props = defaultProps(componentProps, {
    triggerWrapper: (trigger) => <Dynamic component={trigger} />,
  });
  const [localTriggerProps, restTriggerProps] = splitProps(props.triggerProps ?? {}, ['children']);
  const dialogHandle = Dialog.createHandle();

  return (
    <>
      {props.triggerWrapper((p) => (
        <Dialog.Trigger {...p} data-testid="trigger" {...restTriggerProps} handle={dialogHandle}>
          {localTriggerProps.children ?? 'Open'}
        </Dialog.Trigger>
      ))}
      <ContainedTriggerDialog
        {...props}
        rootProps={{ ...props.rootProps, handle: dialogHandle }}
        omitTrigger
      />
    </>
  );
}

function MultipleDetachedTriggersDialog(componentProps: Omit<TestDialogProps, 'omitTrigger'>) {
  const props = defaultProps(componentProps, {
    triggerWrapper: (trigger) => <Dynamic component={trigger} />,
  });
  const [localTriggerProps, restTriggerProps] = splitProps(props.triggerProps ?? {}, ['children']);
  const dialogHandle = Dialog.createHandle();

  return (
    <>
      {props.triggerWrapper((p) => (
        <Dialog.Trigger {...p} data-testid="trigger" {...restTriggerProps} handle={dialogHandle}>
          {localTriggerProps.children ?? 'Open'}
        </Dialog.Trigger>
      ))}
      <Dialog.Trigger data-testid="trigger-2" handle={dialogHandle}>
        Open another
      </Dialog.Trigger>
      <ContainedTriggerDialog
        {...props}
        rootProps={{ ...props.rootProps, handle: dialogHandle }}
        omitTrigger
      />
    </>
  );
}

import { createRenderer, isJSDOM } from '#test-utils';
import { Popover } from '@msviderok/base-ui-solid/popover';
import { screen, waitFor } from '@solidjs/testing-library';
import { createSignal, Match, Switch } from 'solid-js';

describe('<Popover.Root />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render } = createRenderer();

  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = { payload: number | undefined };

    it('should open the popover with any trigger', async () => {
      const { user } = render(() => (
        <Popover.Root>
          <Popover.Trigger>Trigger 1</Popover.Trigger>
          <Popover.Trigger>Trigger 2</Popover.Trigger>
          <Popover.Trigger>Trigger 3</Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                Popover Content
                <Popover.Close>Close</Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger1);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger2);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger3);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);
    });

    it('should open the popover with any trigger', async () => {
      const { user } = render(() => (
        <Popover.Root>
          <Popover.Trigger>Trigger 1</Popover.Trigger>
          <Popover.Trigger>Trigger 2</Popover.Trigger>
          <Popover.Trigger>Trigger 3</Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                Popover Content
                <Popover.Close>Close</Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger1);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger2);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger3);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);
    });

    it('should set the payload and render content based on its value', async () => {
      const { user } = render(() => (
        <Popover.Root>
          {(data: NumberPayload) => (
            <>
              <Popover.Trigger payload={1}>Trigger 1</Popover.Trigger>
              <Popover.Trigger payload={2}>Trigger 2</Popover.Trigger>

              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <span data-testid="content">{data.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          )}
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      expect(screen.getByTestId('content').textContent).to.equal('1');

      await user.click(trigger2);
      expect(screen.getByTestId('content').textContent).to.equal('2');
    });

    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      const { user } = render(() => (
        <Popover.Root>
          {(data: NumberPayload) => (
            <>
              <Popover.Trigger payload={1}>Trigger 1</Popover.Trigger>
              <Popover.Trigger payload={2}>Trigger 2</Popover.Trigger>

              <Popover.Portal>
                <Popover.Positioner data-testid="positioner">
                  <Popover.Popup data-testid="popup">
                    <span>{data.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          )}
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');

      await user.click(trigger2);
      expect(screen.getByTestId('popup')).to.equal(popupElement);
      expect(screen.getByTestId('positioner')).to.equal(positionerElement);
    });

    it('should allow controlling the popover state programmatically', async () => {
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <div>
            <Popover.Root
              open={open()}
              triggerId={activeTrigger()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
            >
              {(data: NumberPayload) => (
                <>
                  <Popover.Trigger payload={1} id="trigger-1">
                    Trigger 1
                  </Popover.Trigger>
                  <Popover.Trigger payload={2} id="trigger-2">
                    Trigger 2
                  </Popover.Trigger>

                  <Popover.Portal>
                    <Popover.Positioner>
                      <Popover.Popup>
                        <span data-testid="content">{data.payload as number}</span>
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </>
              )}
            </Popover.Root>
            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-1');
              }}
            >
              Open Trigger 1
            </button>
            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-2');
              }}
            >
              Open Trigger 2
            </button>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      await user.click(screen.getByRole('button', { name: 'Open Trigger 1' }));
      expect(screen.getByTestId('content').textContent).to.equal('1');
      await user.click(screen.getByRole('button', { name: 'Open Trigger 2' }));
      expect(screen.getByTestId('content').textContent).to.equal('2');
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByTestId('content')).to.equal(null);
    });

    it('allows setting an initially open popover', async () => {
      const testPopover = Popover.createHandle<number>();
      render(() => (
        <Popover.Root handle={testPopover} defaultOpen defaultTriggerId="trigger-2">
          {(data: NumberPayload) => (
            <>
              <Popover.Trigger handle={testPopover} payload={1} id="trigger-1">
                Trigger 1
              </Popover.Trigger>
              <Popover.Trigger handle={testPopover} payload={2} id="trigger-2">
                Trigger 2
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popup">
                    <span>{data.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          )}
        </Popover.Root>
      ));

      expect(screen.getByTestId('popup').textContent).to.equal('2');
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: number | undefined };

    function TriggerWithNesting(props: {
      handle: ReturnType<typeof Popover.createHandle>;
      nesting: 0 | 1 | 2 | 3;
    }) {
      const trigger = () => (
        <Popover.Trigger handle={props.handle} id="trigger">
          Trigger
        </Popover.Trigger>
      );

      return (
        <Switch
          fallback={
            <div>
              <div>
                <div>{trigger()}</div>
              </div>
            </div>
          }
        >
          <Match when={props.nesting === 0}>{trigger()}</Match>
          <Match when={props.nesting === 1}>
            <div>{trigger()}</div>
          </Match>
          <Match when={props.nesting === 2}>
            <div>
              <div>{trigger()}</div>
            </div>
          </Match>
        </Switch>
      );
    }

    function DetachedTriggerReparentingTest(props: {
      handle: ReturnType<typeof Popover.createHandle>;
      nesting: 0 | 1 | 2 | 3;
    }) {
      return (
        <>
          <TriggerWithNesting handle={props.handle} nesting={props.nesting} />
          <Popover.Root handle={props.handle}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  Popover Content
                  <Popover.Close>Close</Popover.Close>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </>
      );
    }

    async function openAndClosePopover(user: any) {
      await user.click(screen.getByRole('button', { name: 'Trigger' }));
      await waitFor(() => {
        expect(screen.getByText('Popover Content')).toBeVisible();
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Popover Content')).to.equal(null);
      });
    }

    it('should open the popover with any trigger', async () => {
      const testPopover = Popover.createHandle();
      const { user } = render(() => (
        <div>
          <Popover.Trigger handle={testPopover}>Trigger 1</Popover.Trigger>
          <Popover.Trigger handle={testPopover}>Trigger 2</Popover.Trigger>
          <Popover.Trigger handle={testPopover}>Trigger 3</Popover.Trigger>

          <Popover.Root handle={testPopover}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  Popover Content
                  <Popover.Close>Close</Popover.Close>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger1);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger2);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);

      await user.click(trigger3);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).to.equal(null);
    });

    it('should set the payload and render content based on its value', async () => {
      const testPopover = Popover.createHandle<number>();
      const { user } = render(() => (
        <div>
          <Popover.Trigger handle={testPopover} payload={1}>
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={testPopover} payload={2}>
            Trigger 2
          </Popover.Trigger>

          <Popover.Root handle={testPopover}>
            {(data: NumberPayload) => (
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <span data-testid="content">{data.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      expect(screen.getByTestId('content').textContent).to.equal('1');

      await user.click(trigger2);
      expect(screen.getByTestId('content').textContent).to.equal('2');
    });

    it('keeps detached triggers clickable when reparented (remove wrappers)', async () => {
      const testPopover = Popover.createHandle();

      const [nesting, setNesting] = createSignal<0 | 1 | 2 | 3>(3);
      const { user } = render(() => (
        <DetachedTriggerReparentingTest handle={testPopover} nesting={nesting()} />
      ));

      await openAndClosePopover(user);

      setNesting(2);
      await openAndClosePopover(user);

      setNesting(1);
      await openAndClosePopover(user);

      setNesting(0);
      await openAndClosePopover(user);
    });

    it('keeps detached triggers clickable when reparented (add wrappers)', async () => {
      const testPopover = Popover.createHandle();
      const [nesting, setNesting] = createSignal<0 | 1 | 2 | 3>(0);
      const { user } = render(() => (
        <DetachedTriggerReparentingTest handle={testPopover} nesting={nesting()} />
      ));

      await openAndClosePopover(user);

      setNesting(1);
      await openAndClosePopover(user);

      setNesting(2);
      await openAndClosePopover(user);

      setNesting(3);
      await openAndClosePopover(user);
    });

    it('keeps detached triggers clickable when reparented during Fast Refresh-like handle recreation', async () => {
      const handleA = Popover.createHandle();
      const [state, setState] = createSignal<{
        handle: ReturnType<typeof Popover.createHandle>;
        nesting: 0 | 1 | 2 | 3;
      }>({ handle: handleA, nesting: 3 });
      const { user } = render(() => (
        <DetachedTriggerReparentingTest handle={state().handle} nesting={state().nesting} />
      ));

      await openAndClosePopover(user);

      setState({ handle: Popover.createHandle(), nesting: 2 });
      await openAndClosePopover(user);

      setState({ handle: Popover.createHandle(), nesting: 1 });
      await openAndClosePopover(user);

      setState({ handle: Popover.createHandle(), nesting: 0 });
      await openAndClosePopover(user);
    });

    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      const testPopover = Popover.createHandle<number>();
      const { user } = render(() => (
        <>
          <Popover.Trigger handle={testPopover} payload={1}>
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={testPopover} payload={2}>
            Trigger 2
          </Popover.Trigger>

          <Popover.Root handle={testPopover}>
            {(data: NumberPayload) => (
              <Popover.Portal>
                <Popover.Positioner data-testid="positioner">
                  <Popover.Popup data-testid="popup">
                    <span>{data.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');

      await user.click(trigger2);
      expect(screen.getByTestId('popup')).to.equal(popupElement);
      expect(screen.getByTestId('positioner')).to.equal(positionerElement);
    });

    it('should allow controlling the popover state programmatically', async () => {
      const testPopover = Popover.createHandle<number>();
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <div style={{ margin: '50px' }}>
            <Popover.Trigger handle={testPopover} payload={1} id="trigger-1">
              Trigger 1
            </Popover.Trigger>
            <Popover.Trigger handle={testPopover} payload={2} id="trigger-2">
              Trigger 2
            </Popover.Trigger>

            <Popover.Root
              open={open()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
              triggerId={activeTrigger()}
              handle={testPopover}
            >
              {(data: NumberPayload) => (
                <Popover.Portal>
                  <Popover.Positioner data-testid="positioner" side="bottom" align="start">
                    <Popover.Popup>
                      <span data-testid="content">{data.payload}</span>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              )}
            </Popover.Root>

            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-1');
              }}
            >
              Open Trigger 1
            </button>
            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-2');
              }}
            >
              Open Trigger 2
            </button>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
        );
      }

      const { user } = render(() => <Test />);

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(screen.getByRole('button', { name: 'Open Trigger 1' }));
      expect(screen.getByTestId('content').textContent).to.equal('1');

      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect().left).to.be.closeTo(
          trigger1.getBoundingClientRect().left,
          1,
        );
      });

      await user.click(screen.getByRole('button', { name: 'Open Trigger 2' }));
      expect(screen.getByTestId('content').textContent).to.equal('2');
      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect().left).to.be.closeTo(
          trigger2.getBoundingClientRect().left,
          1,
        );
      });

      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByTestId('content')).to.equal(null);
    });

    it('allows setting an initially open popover', async () => {
      const testPopover = Popover.createHandle<number>();
      render(() => (
        <>
          <Popover.Trigger handle={testPopover} payload={1} id="trigger-1">
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={testPopover} payload={2} id="trigger-2">
            Trigger 2
          </Popover.Trigger>

          <Popover.Root handle={testPopover} defaultOpen defaultTriggerId="trigger-2">
            {(data: NumberPayload) => (
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popup">
                    <span>{data.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </>
      ));

      expect(screen.getByTestId('popup').textContent).to.equal('2');
    });

    it('should not have inline scale style after switching triggers', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const testPopover = Popover.createHandle<number>();

      function Test() {
        return (
          <>
            <Popover.Trigger handle={testPopover} payload={1}>
              Trigger 1
            </Popover.Trigger>
            <Popover.Trigger handle={testPopover} payload={2}>
              Trigger 2
            </Popover.Trigger>

            <Popover.Root handle={testPopover}>
              {(data: NumberPayload) => (
                <Popover.Portal>
                  <Popover.Positioner>
                    <Popover.Popup data-testid="popup">
                      <Popover.Viewport>
                        <span data-testid="content">{data.payload}</span>
                      </Popover.Viewport>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              )}
            </Popover.Root>
          </>
        );
      }

      const { user } = render(() => <Test />);

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      // Open with Trigger 1
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('1');
      });

      // Switch to Trigger 2
      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).to.equal('2');
      });

      // The popup should not have an inline scale style that would override CSS transitions
      const popup = screen.getByTestId('popup');
      expect(popup.style.scale).to.equal('');
    });

    it('keeps positioning correct when conditional triggers unmount and the tree remounts', async () => {
      const testPopover = Popover.createHandle();

      function Test() {
        const [showErrorDemo, setShowErrorDemo] = createSignal(true);

        return (
          <>
            {() => {
              return (
                <>
                  <button
                    onClick={() => {
                      setShowErrorDemo((prev) => !prev);
                    }}
                  >
                    Toggle
                  </button>
                  <div
                    style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      'align-items': 'flex-start',
                      gap: '48px',
                      margin: '50px',
                    }}
                  >
                    <Popover.Trigger handle={testPopover} id="trigger-0">
                      Trigger 0
                    </Popover.Trigger>
                    {showErrorDemo() && (
                      <Popover.Trigger handle={testPopover} id="trigger-1">
                        Trigger 1
                      </Popover.Trigger>
                    )}
                  </div>

                  <Popover.Root handle={testPopover} triggerId="trigger-0" open>
                    <Popover.Portal>
                      <Popover.Positioner data-testid="positioner" sideOffset={4} align="start">
                        <Popover.Popup>Content</Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </Popover.Root>
                </>
              );
            }}
          </>
        );
      }

      const { user } = render(() => <Test />);

      const trigger0 = screen.getByRole('button', { name: 'Trigger 0' });
      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect().left).to.be.closeTo(
          trigger0.getBoundingClientRect().left,
          1,
        );
      });

      await user.click(screen.getByRole('button', { name: 'Toggle' }));
      const trigger0After = screen.getByRole('button', { name: 'Trigger 0' });
      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect().left).to.be.closeTo(
          trigger0After.getBoundingClientRect().left,
          1,
        );
      });
    });
  });

  describe.skipIf(isJSDOM)('imperative actions on the handle', () => {
    it('opens and closes the dialog', async () => {
      const popover = Popover.createHandle();
      render(() => (
        <div>
          <Popover.Trigger handle={popover} id="trigger">
            Trigger
          </Popover.Trigger>
          <Popover.Root handle={popover}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup data-testid="content">Content</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(screen.queryByRole('dialog')).to.equal(null);

      popover.open('trigger');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('Content');
      expect(trigger).to.have.attribute('aria-expanded', 'true');

      popover.close();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).to.equal(null);
      });

      expect(trigger).to.have.attribute('aria-expanded', 'false');
    });

    it('sets the payload assosiated with the trigger', async () => {
      const popover = Popover.createHandle<number>();
      render(() => (
        <div>
          <Popover.Trigger handle={popover} id="trigger1" payload={1}>
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={popover} id="trigger2" payload={2}>
            Trigger 2
          </Popover.Trigger>
          <Popover.Root handle={popover}>
            {(data: { payload: number | undefined }) => (
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="content">{data.payload}</Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByRole('dialog')).to.equal(null);

      popover.open('trigger2');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.to.equal(null);
      });

      expect(screen.getByTestId('content').textContent).to.equal('2');
      expect(trigger2).to.have.attribute('aria-expanded', 'true');
      expect(trigger1).not.to.have.attribute('aria-expanded', 'true');

      popover.close();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).to.equal(null);
      });

      expect(trigger2).to.have.attribute('aria-expanded', 'false');
    });
  });
});

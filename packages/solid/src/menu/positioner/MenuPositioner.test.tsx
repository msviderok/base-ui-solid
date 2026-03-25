import { createRenderer, describeConformance, flushMicrotasks, isJSDOM } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';
import { cleanup, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { expect } from 'chai';
import { createSignal } from 'solid-js';
import { afterEach } from 'vitest';

function Trigger(props: Menu.Trigger.Props) {
  return <Menu.Trigger {...props} ref={props.ref} render="div" nativeButton={false} />;
}

describe('<Menu.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(Menu.Positioner, () => ({
    render: (node, props) =>
      render(() => (
        <Menu.Root open>
          <Menu.Portal>{node(props!)}</Menu.Portal>
        </Menu.Root>
      )),
    refInstanceof: window.HTMLDivElement,
  }));

  describe.skipIf(isJSDOM)('prop: anchor', () => {
    it('should be placed near the specified element when a ref is passed', async () => {
      function TestComponent() {
        let anchor: HTMLDivElement | undefined;

        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={anchor}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div data-testid="anchor" style={{ 'margin-top': '100px' }} ref={anchor} />
          </div>
        );
      }

      render(() => <TestComponent />);

      const positioner = screen.getByTestId('positioner');
      const anchor = screen.getByTestId('anchor');

      const anchorPosition = anchor.getBoundingClientRect();

      await flushMicrotasks();
      await waitFor(() => {
        expect(positioner.style.getPropertyValue('transform')).to.equal(
          `translate(${anchorPosition.left}px, ${anchorPosition.bottom}px)`,
        );
      });
    });

    it('should be placed near the specified element when an element is passed', async () => {
      function TestComponent() {
        const [anchor, setAnchor] = createSignal<HTMLDivElement | null>(null);
        const handleRef = (element: HTMLDivElement | null) => {
          setAnchor(element);
        };

        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={anchor()}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div data-testid="anchor" style={{ 'margin-top': '100px' }} ref={handleRef} />
          </div>
        );
      }

      render(() => <TestComponent />);

      const positioner = screen.getByTestId('positioner');
      const anchor = screen.getByTestId('anchor');

      const anchorPosition = anchor.getBoundingClientRect();

      await flushMicrotasks();

      await waitFor(() => {
        expect(positioner.style.getPropertyValue('transform')).to.equal(
          `translate(${anchorPosition.left}px, ${anchorPosition.bottom}px)`,
        );
      });
    });

    it('should be placed near the specified element when a function returning an element is passed', async () => {
      function TestComponent() {
        const [anchor, setAnchor] = createSignal<HTMLDivElement | null>(null);
        const handleRef = (element: HTMLDivElement | null) => {
          setAnchor(element);
        };

        const getAnchor = () => anchor();

        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={getAnchor}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div data-testid="anchor" style={{ 'margin-top': '100px' }} ref={handleRef} />
          </div>
        );
      }

      render(() => <TestComponent />);

      const positioner = screen.getByTestId('positioner');
      const anchor = screen.getByTestId('anchor');

      const anchorPosition = anchor.getBoundingClientRect();

      await flushMicrotasks();

      await waitFor(() => {
        expect(positioner.style.getPropertyValue('transform')).to.equal(
          `translate(${anchorPosition.left}px, ${anchorPosition.bottom}px)`,
        );
      });
    });

    it('should be placed at the specified position', async () => {
      const boundingRect = {
        x: 200,
        y: 100,
        top: 100,
        left: 200,
        bottom: 100,
        right: 200,
        height: 0,
        width: 0,
        toJSON: () => {},
      };

      const virtualElement = { getBoundingClientRect: () => boundingRect };

      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner
              side="bottom"
              align="start"
              anchor={virtualElement}
              arrowPadding={0}
              data-testid="positioner"
            >
              <Menu.Popup>
                <Menu.Item>1</Menu.Item>
                <Menu.Item>2</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const positioner = screen.getByTestId('positioner');
      await waitFor(() => {
        expect(positioner.style.getPropertyValue('transform')).to.equal(`translate(200px, 100px)`);
      });
    });

    it('should accept a non-memoized function as an anchor', async () => {
      function TestComponent() {
        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={() => null}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        );
      }

      render(() => <TestComponent />);
    });

    it('should react to the anchor changing from a ref to undefined and back', async () => {
      function TestComponent() {
        let anchorRef: HTMLDivElement | undefined;
        const [useAnchorRef, setUseAnchorRef] = createSignal(true);

        return (
          <div style={{ margin: '50px' }}>
            <button type="button" onClick={() => setUseAnchorRef(false)}>
              undefined
            </button>
            <button type="button" onClick={() => setUseAnchorRef(true)}>
              ref
            </button>
            <Menu.Root open>
              <Menu.Trigger>trigger</Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={useAnchorRef() ? anchorRef : undefined}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div
              data-testid="anchor"
              style={{ 'margin-top': '100px', width: '10px', height: '10px' }}
              ref={anchorRef}
            />
          </div>
        );
      }

      render(() => <TestComponent />);

      const positioner = screen.getByTestId('positioner');
      const anchorElement = screen.getByTestId('anchor');

      const setUndefinedButton = screen.getByRole('button', { name: 'undefined' });
      const setRefButton = screen.getByRole('button', { name: 'ref' });
      const trigger = screen.getByRole('button', { name: 'trigger' });

      let anchorRect = anchorElement.getBoundingClientRect();
      await flushMicrotasks();
      await waitFor(() => {
        expect(positioner.style.getPropertyValue('transform')).to.equal(
          `translate(${anchorRect.left}px, ${anchorRect.bottom}px)`,
        );
      });

      await userEvent.click(setUndefinedButton);
      await flushMicrotasks();

      const triggerRect = trigger.getBoundingClientRect();
      expect(positioner.style.getPropertyValue('transform')).to.equal(
        `translate(${Math.floor(triggerRect.left)}px, ${triggerRect.bottom}px)`,
      );

      await userEvent.click(setRefButton);
      await flushMicrotasks();

      anchorRect = anchorElement.getBoundingClientRect();
      expect(positioner.style.getPropertyValue('transform')).to.equal(
        `translate(${anchorRect.left}px, ${anchorRect.bottom}px)`,
      );
    });
  });

  describe.skipIf(isJSDOM)('prop: keepMounted', () => {
    afterEach(async () => {
      cleanup();
    });

    it('when keepMounted=true, should keep the content mounted when closed', async () => {
      render(() => (
        <Menu.Root modal={false}>
          <Menu.Trigger>Toggle</Menu.Trigger>
          <Menu.Portal keepMounted>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>1</Menu.Item>
                <Menu.Item>2</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Toggle' });

      expect(screen.queryByRole('menu', { hidden: true })).not.to.equal(null);
      expect(screen.queryByRole('menu', { hidden: true })).toBeInaccessible();

      await userEvent.click(trigger, { delay: 20 });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: false })).not.to.equal(null);
      });
      expect(screen.queryByRole('menu', { hidden: false })).not.toBeInaccessible();

      await userEvent.click(trigger, { delay: 20 });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: true })).not.to.equal(null);
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: true })).toBeInaccessible();
      });
    });

    it('when keepMounted=false, should unmount the content when closed', async () => {
      render(() => (
        <Menu.Root modal={false}>
          <Menu.Trigger>Toggle</Menu.Trigger>
          <Menu.Portal keepMounted={false}>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>1</Menu.Item>
                <Menu.Item>2</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Toggle' });

      expect(screen.queryByRole('menu', { hidden: true })).to.equal(null);

      await userEvent.click(trigger, { delay: 20 });
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: false })).not.to.equal(null);
      });
      expect(screen.queryByRole('menu', { hidden: false })).not.toBeInaccessible();

      await userEvent.click(trigger, { delay: 20 });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: true })).to.equal(null);
      });
    });
  });

  const baselineX = 10;
  const baselineY = 36;
  const popupWidth = 52;
  const popupHeight = 24;
  const anchorWidth = 72;
  const anchorHeight = 36;
  const triggerStyle = { width: `${anchorWidth}px`, height: `${anchorHeight}px` };
  const popupStyle = { width: `${popupWidth}px`, height: `${popupHeight}px` };

  describe.skipIf(isJSDOM)('prop: sideOffset', () => {
    it('offsets the side when a number is specified', async () => {
      const sideOffset = 7;
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner data-testid="positioner" sideOffset={sideOffset}>
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).to.equal(
          `translate(${baselineX}px, ${baselineY + sideOffset}px)`,
        );
      });
    });

    it('offsets the side when a function is specified', async () => {
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner
              data-testid="positioner"
              sideOffset={(data) => data.positioner.width + data.anchor.width}
            >
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).to.equal(
          `translate(${baselineX}px, ${baselineY + popupWidth + anchorWidth}px)`,
        );
      });
    });

    it('can read the latest side inside sideOffset', async () => {
      let side = 'none';
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="left"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside sideOffset', async () => {
      let align = 'none';
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              sideOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      // correctly flips the align in the browser
      await waitFor(() => {
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside sideOffset', async () => {
      let side = 'none';
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="inline-start"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('inline-end');
      });
    });
  });

  describe.skipIf(isJSDOM)('prop: alignOffset', () => {
    it('offsets the align when a number is specified', async () => {
      const alignOffset = 7;
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner data-testid="positioner" alignOffset={alignOffset}>
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).to.equal(
          `translate(${baselineX + alignOffset}px, ${baselineY}px)`,
        );
      });
    });

    it('offsets the align when a function is specified', async () => {
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner data-testid="positioner" alignOffset={(data) => data.positioner.width}>
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).to.equal(
          `translate(${baselineX + popupWidth}px, ${baselineY}px)`,
        );
      });
    });

    it('can read the latest side inside alignOffset', async () => {
      let side = 'none';
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="left"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside alignOffset', async () => {
      let align = 'none';
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              alignOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      // correctly flips the align in the browser
      await waitFor(() => {
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside alignOffset', async () => {
      let side = 'none';
      render(() => (
        <Menu.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="inline-start"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      await waitFor(() => {
        // correctly flips the side in the browser
        expect(side).to.equal('inline-end');
      });
    });
  });
});

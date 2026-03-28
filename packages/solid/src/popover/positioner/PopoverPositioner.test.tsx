import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Popover } from '@msviderok/base-ui-solid/popover';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';

function Trigger(props: Popover.Trigger.Props) {
  return <Popover.Trigger {...props} ref={props.ref} render="div" nativeButton={false} />;
}

describe('<Popover.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Positioner, () => ({
    render: (node, props) =>
      render(() => (
        <Popover.Root open>
          <Popover.Trigger>Trigger</Popover.Trigger>
          <Popover.Portal>{node(props!)}</Popover.Portal>
        </Popover.Root>
      )),
    refInstanceof: window.HTMLDivElement,
  }));

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
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner data-testid="positioner" sideOffset={sideOffset}>
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect()).to.include({
          x: baselineX,
          y: baselineY + sideOffset,
        });
      });
    });

    it('offsets the side when a function is specified', async () => {
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              data-testid="positioner"
              sideOffset={(data) => data.positioner.width + data.anchor.width}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect()).to.include({
          x: baselineX,
          y: baselineY + popupWidth + anchorWidth,
        });
      });
    });

    it('can read the latest side inside sideOffset', async () => {
      let side = 'none';
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              side="left"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        // correctly flips the side in the browser
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside sideOffset', async () => {
      let align = 'none';
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              sideOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        // correctly flips the align in the browser
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside sideOffset', async () => {
      let side = 'none';
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              side="inline-start"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        // correctly flips the side in the browser
        expect(side).to.equal('inline-end');
      });
    });
  });

  describe.skipIf(isJSDOM)('prop: alignOffset', () => {
    it('offsets the align when a number is specified', async () => {
      const alignOffset = 7;
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner data-testid="positioner" alignOffset={alignOffset}>
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect()).to.include({
          x: baselineX + alignOffset,
          y: baselineY,
        });
      });
    });

    it('offsets the align when a function is specified', async () => {
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              data-testid="positioner"
              alignOffset={(data) => data.positioner.width}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner').getBoundingClientRect()).to.include({
          x: baselineX + popupWidth,
          y: baselineY,
        });
      });
    });

    it('can read the latest side inside alignOffset', async () => {
      let side = 'none';
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              side="left"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        // correctly flips the side in the browser
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside alignOffset', async () => {
      let align = 'none';
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              alignOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        // correctly flips the align in the browser
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside alignOffset', async () => {
      let side = 'none';
      render(() => (
        <Popover.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Popover.Portal>
            <Popover.Positioner
              side="inline-start"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Popover.Popup style={popupStyle}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      await waitFor(() => {
        // correctly flips the side in the browser
        expect(side).to.equal('inline-end');
      });
    });
  });

  it.skipIf(isJSDOM)('remains anchored if keepMounted=false', async () => {
    function App(props: { top: number }) {
      return (
        <Popover.Root open>
          <Trigger
            style={{ width: '100px', height: '100px', position: 'relative', top: `${props.top}px` }}
          >
            Trigger
          </Trigger>
          <Popover.Portal>
            <Popover.Positioner data-testid="positioner">
              <Popover.Popup style={{ width: '100px', height: '100px' }}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      );
    }

    const [top, setTop] = createSignal(0);
    render(() => <App top={top()} />);
    const positioner = screen.getByTestId('positioner');

    const initial = { x: 5, y: 100 };
    const final = { x: 5, y: 200 };

    await waitFor(() => {
      expect(positioner.getBoundingClientRect()).to.include(initial);
    });

    setTop(100);

    await waitFor(() => {
      expect(positioner.getBoundingClientRect()).not.to.include(initial);
    });

    await waitFor(() => {
      expect(positioner.getBoundingClientRect()).to.include(final);
    });
  });

  it.skipIf(isJSDOM)('remains anchored if keepMounted=true', async () => {
    function App(props: { top: number }) {
      return (
        <Popover.Root open>
          <Trigger
            style={{ width: '100px', height: '100px', position: 'relative', top: `${props.top}px` }}
          >
            Trigger
          </Trigger>
          <Popover.Portal keepMounted>
            <Popover.Positioner data-testid="positioner">
              <Popover.Popup style={{ width: '100px', height: '100px' }}>Popup</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      );
    }

    const [top, setTop] = createSignal(0);
    render(() => <App top={top()} />);
    const positioner = screen.getByTestId('positioner');

    const initial = { x: 5, y: 100 };
    const final = { x: 5, y: 200 };

    await waitFor(() => {
      expect(positioner.getBoundingClientRect()).to.include(initial);
    });

    setTop(100);

    await waitFor(() => {
      expect(positioner.getBoundingClientRect()).not.to.include(initial);
    });

    await waitFor(() => {
      expect(positioner.getBoundingClientRect()).to.include(final);
    });
  });
});

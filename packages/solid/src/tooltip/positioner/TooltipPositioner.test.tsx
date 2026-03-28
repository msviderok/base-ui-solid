import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Tooltip } from '@msviderok/base-ui-solid/tooltip';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';

function Trigger(props: Tooltip.Trigger.Props) {
  return <Tooltip.Trigger {...props} ref={props.ref} render="div" />;
}

describe('<Tooltip.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Positioner, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Tooltip.Root open>
          <Tooltip.Portal>{node(props!)}</Tooltip.Portal>
        </Tooltip.Root>
      ));
    },
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
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner data-testid="positioner" sideOffset={sideOffset}>
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
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
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              data-testid="positioner"
              sideOffset={(data) => data.positioner.width + data.anchor.width}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
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
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="left"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside sideOffset', async () => {
      let align = 'none';
      render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              sideOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      // correctly flips the align in the browser
      await waitFor(() => {
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside sideOffset', async () => {
      let side = 'none';
      render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="inline-start"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
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
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner data-testid="positioner" alignOffset={alignOffset}>
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
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
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              data-testid="positioner"
              alignOffset={(data) => data.positioner.width}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
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
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="left"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside alignOffset', async () => {
      let align = 'none';
      render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              alignOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      // correctly flips the align in the browser
      await waitFor(() => {
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside alignOffset', async () => {
      let side = 'none';
      render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="inline-start"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('inline-end');
      });
    });
  });

  it.skipIf(isJSDOM)('uses transform positioning without Viewport', async () => {
    render(() => (
      <Tooltip.Root open>
        <Trigger style={triggerStyle}>Trigger</Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner data-testid="positioner">
            <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    const positioner = screen.getByTestId('positioner');
    expect(positioner.style.transform).not.to.equal('');
  });

  it.skipIf(isJSDOM)('uses top/left positioning with Viewport', async () => {
    render(() => (
      <Tooltip.Root open>
        <Trigger style={triggerStyle}>Trigger</Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner data-testid="positioner">
            <Tooltip.Popup style={popupStyle}>
              <Tooltip.Viewport>Popup</Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    const positioner = screen.getByTestId('positioner');
    await waitFor(() => {
      expect(positioner.style.transform).to.equal('');
    });
  });
});

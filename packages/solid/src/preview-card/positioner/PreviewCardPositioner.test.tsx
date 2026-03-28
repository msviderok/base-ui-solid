import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { PreviewCard } from '@msviderok/base-ui-solid/preview-card';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';

function Trigger(props: PreviewCard.Trigger.Props) {
  return <PreviewCard.Trigger {...props} ref={props.ref} render="div" />;
}

describe('<PreviewCard.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(PreviewCard.Positioner, () => ({
    render: (node, props) =>
      render(() => (
        <PreviewCard.Root open>
          <PreviewCard.Portal>{node(props!)}</PreviewCard.Portal>
        </PreviewCard.Root>
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
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner data-testid="positioner" sideOffset={sideOffset}>
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
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
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              data-testid="positioner"
              sideOffset={(data) => data.positioner.width + data.anchor.width}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
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
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              side="left"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside sideOffset', async () => {
      let align = 'none';
      render(() => (
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              sideOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      ));

      // correctly flips the align in the browser
      await waitFor(() => {
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside sideOffset', async () => {
      let side = 'none';
      render(() => (
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              side="inline-start"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
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
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner data-testid="positioner" alignOffset={alignOffset}>
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
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
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              data-testid="positioner"
              alignOffset={(data) => data.positioner.width}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
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
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              side="left"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('right');
      });
    });

    it('can read the latest align inside alignOffset', async () => {
      let align = 'none';
      render(() => (
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              alignOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      ));

      // correctly flips the align in the browser
      await waitFor(() => {
        expect(align).to.equal('end');
      });
    });

    it('reads logical side inside alignOffset', async () => {
      let side = 'none';
      render(() => (
        <PreviewCard.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <PreviewCard.Portal>
            <PreviewCard.Positioner
              side="inline-start"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      ));

      // correctly flips the side in the browser
      await waitFor(() => {
        expect(side).to.equal('inline-end');
      });
    });
  });

  it.skipIf(isJSDOM)('uses transform positioning without Viewport', async () => {
    render(() => (
      <PreviewCard.Root open>
        <Trigger style={triggerStyle}>Trigger</Trigger>
        <PreviewCard.Portal>
          <PreviewCard.Positioner data-testid="positioner">
            <PreviewCard.Popup style={popupStyle}>Popup</PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ));

    const positioner = screen.getByTestId('positioner');
    expect(positioner.style.transform).not.to.equal('');
  });

  it.skipIf(isJSDOM)('uses top/left positioning with Viewport', async () => {
    render(() => (
      <PreviewCard.Root open>
        <Trigger style={triggerStyle}>Trigger</Trigger>
        <PreviewCard.Portal>
          <PreviewCard.Positioner data-testid="positioner">
            <PreviewCard.Popup style={popupStyle}>
              <PreviewCard.Viewport>Popup</PreviewCard.Viewport>
            </PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ));

    const positioner = screen.getByTestId('positioner');
    await waitFor(() => {
      expect(positioner.style.transform).to.equal('');
    });
  });
});

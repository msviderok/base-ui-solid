import { createRenderer, describeConformance } from '#test-utils';
import { Tooltip } from '@msviderok/base-ui-solid/tooltip';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';

describe('<Tooltip.Trigger />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Trigger, () => ({
    refInstanceof: window.HTMLButtonElement,
    render(node, props) {
      return render(() => <Tooltip.Root>{node(props!)}</Tooltip.Root>);
    },
  }));

  it('removes `data-popup-open` as soon as `open` becomes false', async () => {
    function TooltipWithPreventedUnmount() {
      const [open, setOpen] = createSignal(false);

      return (
        <Tooltip.Root
          open={open()}
          onOpenChange={(nextOpen, eventDetails) => {
            if (!nextOpen) {
              eventDetails.preventUnmountOnClose();
            }
            setOpen(nextOpen);
          }}
        >
          <Tooltip.Trigger data-testid="trigger" delay={0} closeDelay={0}>
            Trigger
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>Content</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      );
    }

    const { user } = render(() => <TooltipWithPreventedUnmount />);
    const trigger = screen.getByTestId('trigger');

    await user.hover(trigger);
    await waitFor(() => {
      expect(trigger).to.have.attribute('data-popup-open');
    });

    await user.unhover(trigger);
    await waitFor(() => {
      expect(trigger).not.to.have.attribute('data-popup-open');
    });

    expect(screen.getByText('Content')).not.to.equal(null);
  });
});

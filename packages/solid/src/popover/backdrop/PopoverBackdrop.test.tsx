import { createRenderer, describeConformance } from '#test-utils';
import { Popover } from '@msviderok/base-ui-solid/popover';
import { screen, waitFor } from '@solidjs/testing-library';

describe('<Popover.Backdrop />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Backdrop, () => ({
    render: (node, props) => render(() => <Popover.Root open>{node(props!)}</Popover.Root>),
    refInstanceof: window.HTMLDivElement,
  }));

  it('sets `pointer-events: none` style on backdrop if opened by hover', async () => {
    const { user } = render(() => (
      <Popover.Root>
        <Popover.Trigger delay={0} openOnHover>
          Open
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Positioner>
            <Popover.Popup />
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    await user.hover(screen.getByText('Open'));

    expect(screen.getByTestId('backdrop').style.pointerEvents).to.equal('none');
  });

  it('does not set `pointer-events: none` style on backdrop if opened by click', async () => {
    const { user } = render(() => (
      <Popover.Root>
        <Popover.Trigger openOnHover>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Positioner>
            <Popover.Popup />
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByTestId('backdrop').style.pointerEvents).not.to.equal('none');
    });
  });
});

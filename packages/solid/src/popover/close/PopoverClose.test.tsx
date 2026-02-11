import { createRenderer, describeConformance } from '#test-utils';
import { Popover } from '@msviderok/base-ui-solid/popover';
import { fireEvent, screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Popover.Close />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Close, () => ({
    refInstanceof: window.HTMLButtonElement,
    testComponentPropWith: 'button',
    button: true,

    render: (node, props) =>
      render(() => (
        <Popover.Root open>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>{node(props!)}</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )),
  }));

  it('should close popover when clicked', async () => {
    render(() => (
      <Popover.Root defaultOpen>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              Content
              <Popover.Close data-testid="close" />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    expect(screen.queryByText('Content')).not.to.equal(null);

    fireEvent.click(screen.getByTestId('close'));

    expect(screen.queryByText('Content')).to.equal(null);
  });
});

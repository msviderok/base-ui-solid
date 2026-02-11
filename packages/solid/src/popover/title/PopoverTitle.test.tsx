import { createRenderer, describeConformance } from '#test-utils';
import { Popover } from '@msviderok/base-ui-solid/popover';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Popover.Title />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Title, () => ({
    render: (node, props) =>
      render(() => (
        <Popover.Root open>
          <Popover.Trigger>Trigger</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>{node(props!)}</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )),
    refInstanceof: window.HTMLHeadingElement,
  }));

  it('labels the popup element with its id', async () => {
    render(() => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Title>Title</Popover.Title>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    const id = document.querySelector('h2')?.id;
    expect(screen.getByRole('dialog')).to.have.attribute('aria-labelledby', id);
  });
});

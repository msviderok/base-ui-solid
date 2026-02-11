import { createRenderer, describeConformance } from '#test-utils';
import { Popover } from '@msviderok/base-ui-solid/popover';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Popover.Description />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Description, () => ({
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
    refInstanceof: window.HTMLParagraphElement,
  }));

  it('describes the popup element with its id', async () => {
    render(() => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Description>Title</Popover.Description>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    const id = document.querySelector('p')?.id;
    expect(screen.getByRole('dialog')).to.have.attribute('aria-describedby', id);
  });
});

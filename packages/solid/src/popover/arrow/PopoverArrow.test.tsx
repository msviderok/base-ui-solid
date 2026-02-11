import { createRenderer, describeConformance } from '#test-utils';
import { Popover } from '@msviderok/base-ui-solid/popover';

describe('<Popover.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Arrow, () => ({
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
    refInstanceof: window.HTMLDivElement,
  }));
});

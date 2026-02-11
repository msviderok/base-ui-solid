import { createRenderer, describeConformance } from '#test-utils';
import { Dialog } from '@msviderok/base-ui-solid/dialog';

describe('<Dialog.Title />', () => {
  const { render } = createRenderer();

  describeConformance(Dialog.Title, () => ({
    refInstanceof: window.HTMLHeadingElement,
    render: (node, props) =>
      render(() => (
        <Dialog.Root open modal={false}>
          <Dialog.Portal>
            <Dialog.Popup>{node(props!)}</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )),
  }));
});

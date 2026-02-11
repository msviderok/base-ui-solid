import { createRenderer, describeConformance } from '#test-utils';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';

describe('<Dialog.Viewport />', () => {
  const { render } = createRenderer();

  describeConformance(Dialog.Viewport, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) => {
      return render(() => (
        <Dialog.Root open modal={false}>
          <Dialog.Portal>
            {node(props!)}
            <Dialog.Popup />
          </Dialog.Portal>
        </Dialog.Root>
      ));
    },
  }));

  it('renders only when the dialog is mounted by default', async () => {
    function App() {
      const [open, setOpen] = createSignal(false);
      return (
        <Dialog.Root open={open()} onOpenChange={setOpen} modal={false}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Viewport data-testid="viewport">
              <Dialog.Popup data-testid="popup">Content</Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      );
    }

    const { user } = render(() => <App />);

    expect(screen.queryByTestId('viewport')).to.equal(null);

    await user.click(screen.getByText('Open'));

    expect(screen.getByTestId('viewport')).not.to.equal(null);
    expect(screen.getByTestId('viewport')).to.contain(screen.getByTestId('popup'));
  });

  it('stays mounted when used within a keepMounted portal', async () => {
    const [open, setOpen] = createSignal<boolean>(true);
    render(() => (
      <Dialog.Root open={open()} modal={false}>
        <Dialog.Portal keepMounted>
          <Dialog.Viewport data-testid="viewport">
            <Dialog.Popup>Content</Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    ));

    expect(screen.getByTestId('viewport')).not.to.equal(null);

    setOpen(false);

    expect(screen.getByTestId('viewport')).not.to.equal(null);
  });
});

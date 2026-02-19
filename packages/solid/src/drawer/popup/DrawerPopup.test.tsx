import { createRenderer, describeConformance } from '#test-utils';
import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import { screen, waitFor } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

describe('<Drawer.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(Drawer.Popup, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Drawer.Root open>
          <Drawer.Portal>{node(props!)}</Drawer.Portal>
        </Drawer.Root>
      ));
    },
  }));

  it('defaults initial focus to the popup element', async () => {
    render(() => (
      <div>
        <input />
        <Drawer.Root modal={false}>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Viewport>
              <Drawer.Popup data-testid="popup">
                <input data-testid="popup-input" />
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    ));

    screen.getByRole('button', { name: 'Open' }).click();

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toHaveFocus();
      expect(screen.getByTestId('popup-input')).not.toHaveFocus();
    });
  });
});

import { createRenderer, describeConformance } from '#test-utils';
import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import { screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

describe('<Drawer.Content />', () => {
  const { render } = createRenderer();

  describeConformance(Drawer.Content, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Drawer.Root open>
          <Drawer.Portal>
            <Drawer.Viewport>
              <Drawer.Popup>{node(props!)}</Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      ));
    },
  }));

  it('adds data-swipe-ignore', async () => {
    render(() => (
      <Drawer.Root open>
        <Drawer.Portal>
          <Drawer.Viewport>
            <Drawer.Popup>
              <Drawer.Content data-testid="content">Content</Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    ));

    expect(screen.getByTestId('content').getAttribute('data-swipe-ignore')).toBe('');
  });
});

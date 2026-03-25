import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { splitProps } from 'solid-js';

describe('<Menu.Item />', () => {
  const { render, clock } = createRenderer({
    clockOptions: {
      shouldAdvanceTime: true,
    },
  });

  clock.withFakeTimers();

  describeConformance(Menu.Item, () => ({
    refInstanceof: window.HTMLDivElement,
    button: true,
    render: (node, props) => render(() => <Menu.Root open>{node(props!)}</Menu.Root>),
  }));

  it('calls the onClick handler when clicked', async () => {
    const onClick = spy();
    const { user } = render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item onClick={onClick} id="item">
                Item
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const item = screen.getByRole('menuitem');
    await user.click(item);

    expect(onClick.callCount).to.equal(1);
  });

  it('does not close the menu when onClick prevents Base UI handler', async () => {
    const onClick = spy((event) => event.preventBaseUIHandler());
    const { user } = render(() => (
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item onClick={onClick}>Item</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);

    const item = screen.getByRole('menuitem');
    await user.click(item);

    expect(onClick.callCount).to.equal(1);
    expect(screen.queryByRole('menu')).not.to.equal(null);
  });

  it('perf: does not rerender menu items unnecessarily', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    const renderItem1Spy = spy();
    const renderItem2Spy = spy();
    const renderItem3Spy = spy();
    const renderItem4Spy = spy();

    function LoggingRoot(props: any & { renderSpy: () => void }) {
      const [local, other] = splitProps(props, ['renderSpy', 'state']);
      // eslint-disable-next-line solid/reactivity
      local.renderSpy();
      return <li {...other} ref={props.ref} />;
    }

    const { user } = render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item
                render={{
                  component: LoggingRoot,
                  renderSpy: renderItem1Spy,
                }}
                id="item-1"
              >
                1
              </Menu.Item>
              <Menu.Item
                render={{
                  component: LoggingRoot,
                  renderSpy: renderItem2Spy,
                }}
                id="item-2"
              >
                2
              </Menu.Item>
              <Menu.Item
                render={{
                  component: LoggingRoot,
                  renderSpy: renderItem3Spy,
                }}
                id="item-3"
              >
                3
              </Menu.Item>
              <Menu.Item
                render={{
                  component: LoggingRoot,
                  renderSpy: renderItem4Spy,
                }}
                id="item-4"
              >
                4
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const menuItems = screen.getAllByRole('menuitem');
    menuItems[0].focus();

    renderItem1Spy.resetHistory();
    renderItem2Spy.resetHistory();
    renderItem3Spy.resetHistory();
    renderItem4Spy.resetHistory();

    expect(renderItem1Spy.callCount).to.equal(0);

    await user.keyboard('{ArrowDown}'); // highlights '2'

    await waitFor(
      () => {
        expect(menuItems[0]).not.to.have.attribute('data-highlighted');
        expect(menuItems[1]).to.have.attribute('data-highlighted');
      },
      { timeout: 1000 },
    );

    // Solid updates the DOM state for plain menu items without re-invoking the custom render
    // component, so no item needs to rerender here.
    expect(renderItem1Spy.callCount).to.equal(0);
    expect(renderItem2Spy.callCount).to.equal(0);
    expect(renderItem3Spy.callCount).to.equal(0);
    expect(renderItem4Spy.callCount).to.equal(0);
  });

  describe('prop: closeOnClick', () => {
    it('closes the menu when the item is clicked by default', async () => {
      const { user } = render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>Item</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitem');
      await user.click(item);

      expect(screen.queryByRole('menu')).to.equal(null);
    });

    it('when `closeOnClick=false` does not close the menu when the item is clicked', async () => {
      const { user } = render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item closeOnClick={false}>Item</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitem');
      await user.click(item);

      expect(screen.queryByRole('menu')).not.to.equal(null);
    });
  });

  describe('disabled state', () => {
    it('can be focused but not interacted with when disabled', async () => {
      const handleClick = spy();
      const handleKeyDown = spy();
      const handleKeyUp = spy();

      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item
                  disabled
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                >
                  Item
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const item = screen.getByRole('menuitem');
      item.focus();
      expect(item).toHaveFocus();

      fireEvent.keyDown(item, { key: 'Enter' });
      expect(handleKeyDown.callCount).to.equal(0);
      expect(handleClick.callCount).to.equal(0);

      fireEvent.keyUp(item, { key: 'Space' });
      expect(handleKeyUp.callCount).to.equal(0);
      expect(handleClick.callCount).to.equal(0);

      fireEvent.click(item);
      expect(handleKeyDown.callCount).to.equal(0);
      expect(handleKeyUp.callCount).to.equal(0);
      expect(handleClick.callCount).to.equal(0);
    });
  });
});

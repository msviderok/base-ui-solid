import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { splitProps } from 'solid-js';
import { MenuRadioGroupContext } from '../radio-group/MenuRadioGroupContext';

const testRadioGroupContext = {
  value: () => '0',
  setValue: () => {},
  disabled: () => false,
};

describe('<Menu.RadioItem />', () => {
  const { render, clock } = createRenderer({
    clockOptions: {
      shouldAdvanceTime: true,
    },
  });

  clock.withFakeTimers();

  describeConformance(
    (props) => <Menu.RadioItem value="0" {...props} ref={props.ref} />,
    () => ({
      render: (node, props) =>
        render(() => (
          <Menu.Root open>
            <MenuRadioGroupContext.Provider value={testRadioGroupContext}>
              {node(props!)}
            </MenuRadioGroupContext.Provider>
          </Menu.Root>
        )),
      refInstanceof: window.HTMLDivElement,
    }),
  );

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

    render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup>
                <Menu.RadioItem
                  value={1}
                  render={{ component: LoggingRoot, renderSpy: renderItem1Spy }}
                  id="item-1"
                >
                  1
                </Menu.RadioItem>
                <Menu.RadioItem
                  value={2}
                  render={{ component: LoggingRoot, renderSpy: renderItem2Spy }}
                  id="item-2"
                >
                  2
                </Menu.RadioItem>
                <Menu.RadioItem
                  value={3}
                  render={{ component: LoggingRoot, renderSpy: renderItem3Spy }}
                  id="item-3"
                >
                  3
                </Menu.RadioItem>
                <Menu.RadioItem
                  value={4}
                  render={{ component: LoggingRoot, renderSpy: renderItem4Spy }}
                  id="item-4"
                >
                  4
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const menuItems = screen.getAllByRole('menuitemradio');
    menuItems[0].focus();

    renderItem1Spy.resetHistory();
    renderItem2Spy.resetHistory();
    renderItem3Spy.resetHistory();
    renderItem4Spy.resetHistory();

    expect(renderItem1Spy.callCount).to.equal(0);

    fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' }); // highlights '2'

    await waitFor(
      () => {
        expect(menuItems[0]).not.to.have.attribute('data-highlighted');
        expect(menuItems[1]).to.have.attribute('data-highlighted');
      },
      { timeout: 1000 },
    );
    // Solid updates the DOM state for menu radio items without re-invoking the custom render
    // component, so no item needs to rerender here.
    expect(renderItem1Spy.callCount).to.equal(0);
    expect(renderItem2Spy.callCount).to.equal(0);
    expect(renderItem3Spy.callCount).to.equal(0);
    expect(renderItem4Spy.callCount).to.equal(0);
  });

  describe('state management', () => {
    it('adds the state and ARIA attributes when selected', async () => {
      const { user } = render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.RadioGroup defaultValue={0}>
                  <Menu.RadioItem value={1}>Item</Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitemradio');
      await user.click(item);

      expect(item).to.have.attribute('aria-checked', 'true');
      expect(item).to.have.attribute('data-checked', '');
    });

    ['Space', 'Enter'].forEach((key) => {
      it(`selects the item when ${key} is pressed`, async () => {
        const { user } = render(() => (
          <Menu.Root>
            <Menu.Trigger>Open</Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.RadioGroup defaultValue={0}>
                  <Menu.RadioItem value={1}>Item</Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ));

        const trigger = screen.getByRole('button', { name: 'Open' });
        trigger.focus();
        await user.keyboard('[ArrowDown]');
        const item = () => screen.getByRole('menuitemradio');

        await waitFor(() => {
          expect(item()).toHaveFocus();
        });

        await user.keyboard(`[${key}]`);
        expect(item()).to.have.attribute('data-checked', '');
      });
    });

    it('calls `onValueChange` when the item is clicked', async () => {
      const onValueChange = spy();
      const { user } = render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.RadioGroup defaultValue={0} onValueChange={onValueChange}>
                  <Menu.RadioItem value={1}>Item</Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitemradio');
      await user.click(item);

      expect(onValueChange.callCount).to.equal(1);
      expect(onValueChange.lastCall.args[0]).to.equal(1);
    });

    it('keeps the state when closed and reopened', async () => {
      const { user } = render(() => (
        <Menu.Root modal={false}>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal keepMounted>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.RadioGroup defaultValue={0}>
                  <Menu.RadioItem value={1}>Item</Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitemradio');
      await user.click(item);

      await user.click(trigger); // close the menu

      await waitFor(() => {
        expect(screen.queryByRole('menu')).to.equal(null);
      });

      await user.click(trigger); // reopen the menu

      const itemAfterReopen = await screen.findByRole('menuitemradio');
      expect(itemAfterReopen).to.have.attribute('aria-checked', 'true');
      expect(itemAfterReopen).to.have.attribute('data-checked', '');
    });
  });

  describe('prop: closeOnClick', () => {
    it('when `closeOnClick=true`, closes the menu when the item is clicked', async () => {
      const { user } = render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.RadioGroup defaultValue={0}>
                  <Menu.RadioItem closeOnClick value={1}>
                    Item
                  </Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitemradio');
      await user.click(item);

      expect(screen.queryByRole('menu')).to.equal(null);
    });

    it('does not close the menu when the item is clicked by default', async () => {
      const { user } = render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.RadioGroup defaultValue={0}>
                  <Menu.RadioItem value={1}>Item</Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitemradio');
      await user.click(item);

      expect(screen.queryByRole('menu')).not.to.equal(null);
    });
  });

  describe('focusableWhenDisabled', () => {
    it('can be focused but not interacted with when a radio group is disabled', async () => {
      const handleClick = spy();
      const handleKeyDown = spy();
      const handleKeyUp = spy();
      const handleValueChange = spy();

      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.RadioGroup defaultValue={0} disabled onValueChange={handleValueChange}>
                  <Menu.RadioItem
                    value="one"
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                  >
                    one
                  </Menu.RadioItem>
                  <Menu.RadioItem
                    value="two"
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                  >
                    two
                  </Menu.RadioItem>
                </Menu.RadioGroup>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const [item1, item2] = screen.getAllByRole('menuitemradio');

      expect(item1).to.have.attribute('data-disabled');
      expect(item2).to.have.attribute('data-disabled');

      item1.focus();
      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'Enter' });
      expect(handleKeyDown.callCount).to.equal(0);
      expect(handleClick.callCount).to.equal(0);
      expect(handleValueChange.callCount).to.equal(0);

      fireEvent.keyUp(item1, { key: 'Space' });
      expect(handleKeyDown.callCount).to.equal(0);
      expect(handleClick.callCount).to.equal(0);
      expect(handleValueChange.callCount).to.equal(0);

      fireEvent.click(item1);
      expect(handleClick.callCount).to.equal(0);
      expect(handleValueChange.callCount).to.equal(0);

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      expect(handleKeyDown.callCount).to.equal(0);
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'Enter' });
      expect(handleKeyDown.callCount).to.equal(0);
      expect(handleClick.callCount).to.equal(0);
      expect(handleValueChange.callCount).to.equal(0);

      fireEvent.keyUp(item2, { key: 'Space' });
      expect(handleKeyDown.callCount).to.equal(0);
      expect(handleClick.callCount).to.equal(0);
      expect(handleValueChange.callCount).to.equal(0);

      fireEvent.click(item2);
      expect(handleClick.callCount).to.equal(0);
      expect(handleValueChange.callCount).to.equal(0);
    });
  });

  it('can be focused but not interacted with when individual items are disabled', async () => {
    const handleClick = spy();
    const handleKeyDown = spy();
    const handleKeyUp = spy();
    const handleValueChange = spy();

    render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup defaultValue={0} onValueChange={handleValueChange}>
                <Menu.RadioItem
                  value="one"
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  disabled
                >
                  one
                </Menu.RadioItem>
                <Menu.RadioItem
                  value="two"
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                >
                  two
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const [item1, item2] = screen.getAllByRole('menuitemradio');

    expect(item1).to.have.attribute('data-disabled');
    expect(item2).to.not.have.attribute('data-disabled');

    item1.focus();
    expect(item1).toHaveFocus();

    fireEvent.keyDown(item1, { key: 'Enter' });
    expect(handleKeyDown.callCount).to.equal(0);
    expect(handleClick.callCount).to.equal(0);
    expect(handleValueChange.callCount).to.equal(0);

    fireEvent.keyUp(item1, { key: 'Space' });
    expect(handleKeyDown.callCount).to.equal(0);
    expect(handleClick.callCount).to.equal(0);
    expect(handleValueChange.callCount).to.equal(0);

    fireEvent.click(item1);
    expect(handleClick.callCount).to.equal(0);
    expect(handleValueChange.callCount).to.equal(0);

    fireEvent.keyDown(item1, { key: 'ArrowDown' });
    expect(handleKeyDown.callCount).to.equal(0);
    expect(item2).toHaveFocus();

    fireEvent.keyDown(item2, { key: 'Enter' });
    expect(handleKeyDown.callCount).to.equal(1);
    expect(handleClick.callCount).to.equal(1);
    expect(handleValueChange.callCount).to.equal(1);
    expect(handleValueChange.args[0][0]).to.equal('two');

    fireEvent.keyDown(item2, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(item1).toHaveFocus();
    });
  });
});

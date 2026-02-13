import { createRenderer, describeConformance, flushMicrotasks } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';
import { Popover } from '@msviderok/base-ui-solid/popover';
import { fireEvent, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { expect } from 'chai';
import { PATIENT_CLICK_THRESHOLD } from '../../utils/constants';

describe('<Menu.Trigger />', () => {
  const { render } = createRenderer();
  const user = userEvent.setup();
  describeConformance(Menu.Trigger, () => ({
    refInstanceof: window.HTMLButtonElement,
    testComponentPropWith: 'button',
    button: true,
    render: (node, props) => render(() => <Menu.Root open>{node(props!)}</Menu.Root>),
  }));

  describe('prop: disabled', () => {
    it('should render a disabled button', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger disabled />
        </Menu.Root>
      ));

      const button = screen.getByRole('button');
      expect(button).to.have.property('disabled', true);
    });

    it('should not open the menu when clicked', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger disabled />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup />
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.queryByRole('menu', { hidden: false })).to.equal(null);
    });
  });

  it('toggles the menu state when clicked', async () => {
    render(() => (
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup />
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const button = screen.getByRole('button', { name: 'Open' });
    await user.click(button);

    const menuPopup = await screen.findByRole('menu', { hidden: false });
    expect(menuPopup).not.to.equal(null);
    expect(menuPopup).to.have.attribute('data-open', '');
  });

  describe('keyboard navigation', () => {
    [
      () => <Menu.Trigger>Open</Menu.Trigger>,
      () => (
        <Menu.Trigger render="span" nativeButton={false}>
          Open
        </Menu.Trigger>
      ),
    ].forEach((buttonComponent) => {
      /**
       * TODO: I cannot find any resemblance of the slots prop in the codebase at all.
       * I assume this is a legacy feature taken from MUI?
       */
      const buttonType = 'native';
      ['ArrowUp', 'ArrowDown', 'Enter', ' '].forEach((key) => {
        if (buttonType === 'native' && (key === ' ' || key === 'Enter')) {
          return;
        }

        it(`opens the menu when pressing "${key}" on a ${buttonType} button`, async () => {
          render(() => (
            <Menu.Root>
              {buttonComponent()}
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          ));

          const button = screen.getByRole('button', { name: 'Open' });
          button.focus();

          await user.keyboard(`[${key}]`);

          const menuPopup = screen.queryByRole('menu', { hidden: false });
          expect(menuPopup).not.to.equal(null);
        });
      });
    });
  });

  describe('accessibility attributes', () => {
    it('has the aria-haspopup attribute', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger />
        </Menu.Root>
      ));

      const button = screen.getByRole('button');
      expect(button).to.have.attribute('aria-haspopup');
    });

    it('has the aria-expanded=false attribute when closed', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger />
        </Menu.Root>
      ));

      const button = screen.getByRole('button');
      expect(button).to.have.attribute('aria-expanded', 'false');
    });

    it('has the aria-expanded=true attribute when open', async () => {
      render(() => (
        <Menu.Root open>
          <Menu.Trigger>Toggle</Menu.Trigger>
        </Menu.Root>
      ));

      const button = screen.getByRole('button', { name: 'Toggle' });
      expect(button).to.have.attribute('aria-expanded', 'true');
    });
  });

  describe('style hooks', () => {
    it('should have the data-popup-open and data-pressed attributes when open', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger />
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button');

      trigger.click();

      expect(trigger).to.have.attribute('data-popup-open');
      expect(trigger).to.have.attribute('data-pressed');
    });
  });

  describe('impatient clicks with `openOnHover=true`', () => {
    const { clock, render: renderFakeTimers } = createRenderer();

    clock.withFakeTimers();

    it('does not close the menu if the user clicks too quickly', async () => {
      renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger delay={0} openOnHover />
        </Menu.Root>
      ));
      const trigger = screen.getByRole('button');

      fireEvent.mouseMove(trigger);

      clock.tick(PATIENT_CLICK_THRESHOLD - 1);

      fireEvent.click(trigger);

      expect(trigger).to.have.attribute('data-popup-open');
    });

    it('closes the menu if the user clicks patiently', async () => {
      renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger delay={0} openOnHover />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup />
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button');

      fireEvent.mouseEnter(trigger);

      clock.tick(PATIENT_CLICK_THRESHOLD);

      fireEvent.click(trigger);

      expect(trigger).not.to.have.attribute('data-popup-open');
    });

    it('sticks if the user clicks impatiently', async () => {
      renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger delay={0} openOnHover />
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button');

      fireEvent.mouseEnter(trigger);

      clock.tick(PATIENT_CLICK_THRESHOLD - 1);

      fireEvent.click(trigger);
      fireEvent.mouseLeave(trigger);

      expect(trigger).to.have.attribute('data-popup-open');

      clock.tick(1);

      expect(trigger).to.have.attribute('data-popup-open');
    });

    it('does not stick if the user clicks patiently', async () => {
      renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger delay={0} openOnHover />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup />
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button');

      fireEvent.mouseEnter(trigger);

      clock.tick(PATIENT_CLICK_THRESHOLD);

      fireEvent.click(trigger);
      fireEvent.mouseLeave(trigger);

      expect(trigger).not.to.have.attribute('data-popup-open');
    });

    it('sticks when clicked before the hover delay completes', async () => {
      renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger openOnHover delay={300}>
            Open
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>Content</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(100);

      // User clicks impatiently to open
      fireEvent.click(trigger);

      expect(trigger).to.have.attribute('data-popup-open');

      fireEvent.mouseLeave(trigger);

      expect(trigger).to.have.attribute('data-popup-open');
    });

    it('should keep the menu open when re-hovered and clicked within the patient threshold', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger openOnHover delay={100}>
            Open
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>Content</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(100);
      await flushMicrotasks();

      expect(screen.getByText('Content')).not.to.equal(null);

      clock.tick(PATIENT_CLICK_THRESHOLD);

      fireEvent.mouseLeave(trigger);
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      fireEvent.click(trigger);
      expect(screen.getByText('Content')).not.to.equal(null);
    });
  });

  describe('preventBaseUIHandler', () => {
    it('prevents opening the menu with a mouse when `preventBaseUIHandler` is called in onMouseDown', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger onMouseDown={(event) => event.preventBaseUIHandler()} />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup />
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.queryByRole('menu', { hidden: false })).to.equal(null);
    });

    it('prevents opening the menu with keyboard when `preventBaseUIHandler` is called in onClick', async () => {
      render(() => (
        <Menu.Root>
          <Menu.Trigger onClick={(event) => event.preventBaseUIHandler()} />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup />
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('[Enter]');

      expect(screen.queryByRole('menu', { hidden: false })).to.equal(null);
    });
  });

  it('does not have role prop inside a Popover', async () => {
    render(() => (
      <Popover.Root open>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Menu.Root>
                <Menu.Trigger data-testid="menu-trigger" />
              </Menu.Root>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    const button = screen.getByTestId('menu-trigger');
    expect(button).not.to.have.attribute('role');
  });

  it('has a role prop inside a Popover when not a native button', async () => {
    render(() => (
      <Popover.Root open>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Menu.Root>
                <Menu.Trigger data-testid="menu-trigger" render="span" nativeButton={false} />
              </Menu.Root>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    const button = screen.getByTestId('menu-trigger');
    expect(button).to.have.attribute('role', 'button');
  });
});

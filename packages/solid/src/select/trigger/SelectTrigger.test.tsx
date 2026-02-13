import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';

describe('<Select.Trigger />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Trigger, () => ({
    refInstanceof: window.HTMLButtonElement,
    button: true,
    render(node, props) {
      return render(() => <Select.Root open>{node(props!)}</Select.Root>);
    },
  }));

  describe('disabled state', () => {
    it('cannot be focused when disabled', async () => {
      const { user } = render(() => (
        <Select.Root defaultValue="b">
          <Select.Trigger data-testid="trigger" disabled>
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.Item value="a">a</Select.Item>
                <Select.Item value="b">b</Select.Item>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      const trigger = screen.getByTestId('trigger');
      expect(trigger).to.have.attribute('data-disabled');

      await user.keyboard('[Tab]');

      expect(expect(document.activeElement)).not.to.equal(trigger);
    });

    it('does not toggle the popup when disabled', async () => {
      const handleOpenChange = spy();
      render(() => (
        <Select.Root defaultValue="b" onOpenChange={handleOpenChange}>
          <Select.Trigger data-testid="trigger" disabled>
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.Item value="a">a</Select.Item>
                <Select.Item value="b">b</Select.Item>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      const trigger = screen.getByTestId('trigger');

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).to.equal(null);
      });
      expect(handleOpenChange.callCount).to.equal(0);
    });
  });

  describe('placeholder state', () => {
    it('should have the data-placeholder attribute when provided `null` value', async () => {
      render(() => (
        <Select.Root value={null}>
          <Select.Trigger data-testid="trigger">
            <Select.Value data-testid="value" />
          </Select.Trigger>

          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.Item value="a">a</Select.Item>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      const trigger = screen.getByTestId('trigger');
      const value = screen.getByTestId('value');

      expect(trigger).to.have.attribute('data-placeholder');
      expect(value).to.have.attribute('data-placeholder');
    });

    it('should have the data-placeholder attribute when provided custom property with `itemToStringValue`', async () => {
      const shippingMethods = [
        { id: '', name: 'Default' },
        { id: 'standard', name: 'Standard' },
        { id: 'express', name: 'Express' },
        { id: 'overnight', name: 'Overnight' },
      ];

      render(() => (
        <Select.Root
          defaultValue={shippingMethods[0]}
          itemToStringValue={(item) => item.id}
          itemToStringLabel={(item) => item.name}
        >
          <Select.Trigger data-testid="trigger">
            <Select.Value data-testid="value" />
          </Select.Trigger>
        </Select.Root>
      ));

      const trigger = screen.getByTestId('trigger');
      const value = screen.getByTestId('value');

      expect(trigger).to.have.attribute('data-placeholder');
      expect(value).to.have.attribute('data-placeholder');
      expect(value.textContent).to.equal('Default');
    });

    it('should have the data-placeholder attribute when provided { value: null }', async () => {
      const fonts = [{ label: 'Select font', value: null }];

      render(() => (
        <Select.Root items={fonts}>
          <Select.Trigger data-testid="trigger">
            <Select.Value data-testid="value" />
          </Select.Trigger>
        </Select.Root>
      ));

      const trigger = screen.getByTestId('trigger');
      const value = screen.getByTestId('value');

      expect(trigger).to.have.attribute('data-placeholder');
      expect(value).to.have.attribute('data-placeholder');
      expect(value.textContent).to.equal('Select font');
    });

    it('should not have the data-placeholder attribute when provided a value', async () => {
      render(() => (
        <Select.Root defaultValue="a">
          <Select.Trigger data-testid="trigger">
            <Select.Value data-testid="value" />
          </Select.Trigger>
        </Select.Root>
      ));

      const trigger = screen.getByTestId('trigger');
      const value = screen.getByTestId('value');

      expect(trigger).not.to.have.attribute('data-placeholder');
      expect(value).not.to.have.attribute('data-placeholder');
    });
  });

  describe('style hooks', () => {
    it('should have the data-popup-open and data-pressed attributes when open', async () => {
      render(() => (
        <Select.Root>
          <Select.Trigger />
        </Select.Root>
      ));

      const trigger = screen.getByRole('combobox');

      trigger.click();

      expect(trigger).to.have.attribute('data-popup-open');
      expect(trigger).to.have.attribute('data-pressed');
    });
  });

  describe('prop: required', () => {
    it('sets aria-required attribute when required', async () => {
      render(() => (
        <Select.Root required>
          <Select.Trigger data-testid="trigger" />
        </Select.Root>
      ));

      const trigger = screen.getByTestId('trigger');
      expect(trigger).to.have.attribute('aria-required', 'true');
    });
  });
});

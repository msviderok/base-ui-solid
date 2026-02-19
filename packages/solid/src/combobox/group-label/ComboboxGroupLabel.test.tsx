import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Combobox.GroupLabel />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.GroupLabel, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Combobox.Root open>
          <Combobox.Group>{node(props!)}</Combobox.Group>
        </Combobox.Root>
      ));
    },
  }));

  describe('a11y attributes', () => {
    it('wires to group aria-labelledby', async () => {
      render(() => (
        <Combobox.Root open>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Group>
                  <Combobox.GroupLabel>Label</Combobox.GroupLabel>
                </Combobox.Group>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));

      const group = screen.getByRole('group');
      const label = screen.getByText('Label');
      expect(group).to.have.attribute('aria-labelledby', label.id);
    });

    it('uses provided id in aria-labelledby', async () => {
      render(() => (
        <Combobox.Root open>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Group>
                  <Combobox.GroupLabel id="test-group">Label</Combobox.GroupLabel>
                </Combobox.Group>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));

      const group = screen.getByRole('group');
      expect(group).to.have.attribute('aria-labelledby', 'test-group');
    });
  });
});

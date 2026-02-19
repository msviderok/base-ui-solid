import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { screen } from '@mui/internal-test-utils';
import { expect } from 'chai';

describe('<Combobox.List />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.List, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Combobox.Root>{node(props!)}</Combobox.Root>);
    },
  }));

  it('sets role=listbox and aria-multiselectable in multiple mode', async () => {
    render(() => (
      <Combobox.Root multiple defaultOpen>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Item value="a">a</Combobox.Item>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    const list = screen.getByRole('listbox');
    expect(list).to.have.attribute('aria-multiselectable', 'true');
  });
});

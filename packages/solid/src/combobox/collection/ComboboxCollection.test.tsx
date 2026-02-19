import { createRenderer } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Combobox.Collection />', () => {
  const { render } = createRenderer();

  it('renders filtered items', async () => {
    render(() => (
      <Combobox.Root items={['alpha', 'beta', 'alpine']} defaultOpen>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Collection>
                  {(item) => (
                    <Combobox.Item value={item} data-testid={`item-${item}`}>
                      {item}
                    </Combobox.Item>
                  )}
                </Combobox.Collection>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    expect(screen.getByTestId('item-alpha')).not.to.equal(null);
    expect(screen.getByTestId('item-beta')).not.to.equal(null);
    expect(screen.getByTestId('item-alpine')).not.to.equal(null);
  });
});

import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { screen, waitFor } from '@mui/internal-test-utils';
import { expect } from 'chai';

describe('<Combobox.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.Popup, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Combobox.Root open>
          <Combobox.Portal>
            <Combobox.Positioner>{node(props!)}</Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
    },
  }));

  it('exposes open state via data attributes mapping', async () => {
    render(() => (
      <Combobox.Root defaultOpen>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup data-testid="popup" />
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    const popup = await screen.findByTestId('popup');
    expect(popup).to.have.attribute('data-open');
  });

  it('sets role to presentation when input renders outside the popup', async () => {
    render(() => (
      <Combobox.Root defaultOpen items={['Apple']}>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup data-testid="popup" />
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    const popup = await screen.findByTestId('popup');
    await waitFor(() => {
      expect(popup).to.have.attribute('role', 'presentation');
    });
  });

  it('sets role to dialog when input renders inside the popup', async () => {
    render(() => (
      <Combobox.Root defaultOpen items={['Apple']}>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup data-testid="popup">
              <Combobox.Input />
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    const popup = await screen.findByTestId('popup');
    await waitFor(() => {
      expect(popup).to.have.attribute('role', 'dialog');
    });
  });
});

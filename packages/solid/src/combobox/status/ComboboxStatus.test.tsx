import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { screen, waitFor } from '@mui/internal-test-utils';
import { expect } from 'chai';

describe('<Combobox.Status />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.Status, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Combobox.Root>{node(props!)}</Combobox.Root>);
    },
  }));

  it('renders only when open', async () => {
    const { user } = render(() => (
      <Combobox.Root>
        <Combobox.Input data-testid="input" />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.Status />
              <Combobox.List>
                <Combobox.Item value="a">a</Combobox.Item>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    expect(screen.queryByRole('status')).to.equal(null);
    await user.click(screen.getByTestId('input'));
    await waitFor(() => expect(screen.getByRole('status')).not.to.equal(null));
  });
});

import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Combobox.Group />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.Group, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Combobox.Root open>{node(props!)}</Combobox.Root>);
    },
  }));

  it('should render group with label', async () => {
    render(() => (
      <Combobox.Root open>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Group>
              <Combobox.GroupLabel>Fruits</Combobox.GroupLabel>
              <Combobox.Item value="apple">Apple</Combobox.Item>
              <Combobox.Item value="banana">Banana</Combobox.Item>
            </Combobox.Group>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    expect(screen.getByRole('group')).to.have.attribute('aria-labelledby');
    expect(screen.getByText('Fruits')).toBeVisible();
  });

  it('should associate label with group', async () => {
    render(() => (
      <Combobox.Root open>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Group>
              <Combobox.GroupLabel>Vegetables</Combobox.GroupLabel>
              <Combobox.Item value="carrot">Carrot</Combobox.Item>
              <Combobox.Item value="lettuce">Lettuce</Combobox.Item>
            </Combobox.Group>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    const Group = screen.getByRole('group');
    const label = screen.getByText('Vegetables');
    expect(Group).to.have.attribute('aria-labelledby', label.id);
  });
});

import { createRenderer, describeConformance } from '#test-utils';
import { Toast } from '@msviderok/base-ui-solid/toast';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { Button, List } from '../utils/test-utils';

const toast = {
  id: 'test',
  title: 'Toast title',
};

describe('<Toast.Title />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props: any) => (
      <Toast.Title {...props} ref={props.ref}>
        title
      </Toast.Title>
    ),
    () => ({
      refInstanceof: window.HTMLHeadingElement,
      render(node, props) {
        return render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <Toast.Root toast={toast}>{node(props!)}</Toast.Root>
            </Toast.Viewport>
          </Toast.Provider>
        ));
      },
    }),
  );

  it('adds aria-labelledby to the root element', async () => {
    const { user } = render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <List />
        </Toast.Viewport>
        <Button />
      </Toast.Provider>
    ));

    const button = screen.getByRole('button', { name: 'add' });
    await user.click(button);

    const titleElement = screen.getByTestId('title');
    const titleId = titleElement.id;

    const rootElement = screen.getByTestId('root');
    expect(rootElement).not.to.equal(null);
    expect(rootElement.getAttribute('aria-labelledby')).to.equal(titleId);
  });

  it('does not render if it has no children', async () => {
    function AddButton() {
      const { add } = Toast.useToastManager();
      return (
        <button type="button" onClick={() => add({ title: undefined })}>
          add
        </button>
      );
    }

    const { user } = render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <List />
        </Toast.Viewport>
        <AddButton />
      </Toast.Provider>
    ));

    const button = screen.getByRole('button', { name: 'add' });
    await user.click(button);

    const titleElement = screen.queryByTestId('title');
    expect(titleElement).to.equal(null);
  });

  it('renders the title by default', async () => {
    const { user } = render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <List />
        </Toast.Viewport>
        <Button />
      </Toast.Provider>
    ));

    const button = screen.getByRole('button', { name: 'add' });
    await user.click(button);

    const titleElement = screen.getByTestId('title');
    expect(titleElement).not.to.equal(null);
    expect(titleElement.textContent).to.equal('title');
  });
});

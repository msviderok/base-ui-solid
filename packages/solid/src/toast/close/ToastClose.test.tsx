import { createRenderer, describeConformance } from '#test-utils';
import { Toast } from '@msviderok/base-ui-solid/toast';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { Button, List } from '../utils/test-utils';

describe('<Toast.Close />', () => {
  const { render } = createRenderer();

  const toast: Toast.Root.ToastObject = {
    id: 'test',
    title: 'title',
  };

  describeConformance(Toast.Close, () => ({
    refInstanceof: window.HTMLButtonElement,
    testComponentPropWith: 'button',
    button: true,
    render(node, props) {
      return render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <Toast.Root toast={toast}>{node(props!)}</Toast.Root>
          </Toast.Viewport>
        </Toast.Provider>
      ));
    },
  }));

  it('closes the toast when clicked', async () => {
    const { user } = render(() => (
      <Toast.Provider>
        <Toast.Viewport data-testid="viewport">
          <List />
        </Toast.Viewport>
        <Button />
      </Toast.Provider>
    ));

    const button = screen.getByRole('button', { name: 'add' });
    const viewport = screen.getByTestId('viewport');

    await user.click(button);

    expect(screen.getByTestId('title')).not.to.equal(null);

    viewport.focus();

    const closeButton = screen.getByRole('button', { name: 'close-press' });

    await user.click(closeButton);

    expect(screen.queryByTestId('title')).to.equal(null);
  });
});

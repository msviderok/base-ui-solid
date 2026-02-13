import { createRenderer, describeConformance } from '#test-utils';
import { Toast } from '@msviderok/base-ui-solid/toast';

const toast: Toast.Root.ToastObject = {
  id: 'test',
  title: 'Toast title',
};

describe('<Toast.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(Toast.Arrow, () => ({
    refInstanceof: window.Element,
    render(node, props) {
      return render(() => (
        <Toast.Provider>
          <Toast.Positioner toast={toast}>{node(props!)}</Toast.Positioner>
        </Toast.Provider>
      ));
    },
  }));
});

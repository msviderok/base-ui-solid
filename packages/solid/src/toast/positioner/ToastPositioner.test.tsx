import { createRenderer, describeConformance } from '#test-utils';
import { Toast } from '@msviderok/base-ui-solid/toast';

const toast: Toast.Root.ToastObject = {
  id: 'test',
  title: 'Toast title',
};

describe('<Toast.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props) => <Toast.Positioner toast={toast} {...props} ref={props.ref} />,
    () => ({
      refInstanceof: window.HTMLDivElement,
      render(node, props) {
        return render(() => <Toast.Provider>{node(props!)}</Toast.Provider>);
      },
    }),
  );
});

import { createRenderer, describeConformance } from '#test-utils';
import { Toast } from '@msviderok/base-ui-solid/toast';

describe('<Toast.Portal />', () => {
  const { render } = createRenderer();

  describeConformance(Toast.Portal, () => ({
    refInstanceof: window.HTMLDivElement,
    render,
  }));
});

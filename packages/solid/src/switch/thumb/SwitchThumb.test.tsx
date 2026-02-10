import { createRenderer, describeConformance } from '#test-utils';
import { Switch } from '@msviderok/base-ui-solid/switch';
import { SwitchRootContext } from '../root/SwitchRootContext';

const testContext: SwitchRootContext = {
  checked: () => false,
  disabled: () => false,
  readOnly: () => false,
  required: () => false,
  dirty: () => false,
  touched: () => false,
  filled: () => false,
  focused: () => false,
  valid: () => null,
};

describe('<Switch.Thumb />', () => {
  const { render } = createRenderer();

  describeConformance(Switch.Thumb, () => ({
    refInstanceof: window.HTMLSpanElement,
    render: (node, props) => {
      return render(() => (
        <SwitchRootContext.Provider value={testContext}>{node(props!)}</SwitchRootContext.Provider>
      ));
    },
  }));
});

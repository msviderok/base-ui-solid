import { createRenderer, describeConformance } from '#test-utils';
import { Slider } from '@msviderok/base-ui-solid/slider';

describe('<Slider.Control />', () => {
  const { render } = createRenderer();

  describeConformance(Slider.Control, () => ({
    render: (node, props) => {
      return render(() => <Slider.Root>{node(props!)}</Slider.Root>);
    },
    refInstanceof: window.HTMLDivElement,
  }));
});

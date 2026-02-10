import { createRenderer, describeConformance } from '#test-utils';
import { Slider } from '@msviderok/base-ui-solid/slider';

describe('<Slider.Indicator />', () => {
  const { render } = createRenderer();

  describeConformance(Slider.Indicator, () => ({
    render: (node, props) => {
      return render(() => <Slider.Root>{node(props!)}</Slider.Root>);
    },
    refInstanceof: window.HTMLDivElement,
  }));
});

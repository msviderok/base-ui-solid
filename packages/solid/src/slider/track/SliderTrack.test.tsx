import { createRenderer, describeConformance } from '#test-utils';
import { Slider } from '@msviderok/base-ui-solid/slider';

describe('<Slider.Track />', () => {
  const { render } = createRenderer();

  describeConformance(Slider.Track, () => ({
    render: (node, props) => {
      return render(() => <Slider.Root>{node(props!)}</Slider.Root>);
    },
    refInstanceof: window.HTMLDivElement,
  }));
});

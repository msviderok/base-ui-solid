import { createRenderer, describeConformance } from '#test-utils';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';

describe('<ScrollArea.Content />', () => {
  const { render } = createRenderer();

  describeConformance(ScrollArea.Content, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) =>
      render(() => (
        <ScrollArea.Root>
          <ScrollArea.Viewport>{node(props!)}</ScrollArea.Viewport>
        </ScrollArea.Root>
      )),
  }));
});

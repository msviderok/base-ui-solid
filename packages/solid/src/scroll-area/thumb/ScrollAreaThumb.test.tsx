import { createRenderer, describeConformance } from '#test-utils';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';

describe('<ScrollArea.Thumb />', () => {
  const { render } = createRenderer();

  describeConformance(ScrollArea.Thumb, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) =>
      render(() => (
        <ScrollArea.Root>
          <ScrollArea.Scrollbar>{node(props!)}</ScrollArea.Scrollbar>
        </ScrollArea.Root>
      )),
  }));
});

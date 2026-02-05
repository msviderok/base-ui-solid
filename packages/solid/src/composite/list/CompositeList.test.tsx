import { createRenderer } from '#test-utils';
import { expect } from 'chai';
import { CompositeList } from './CompositeList';
import { useCompositeListItem } from './useCompositeListItem';

describe('<CompositeList />', () => {
  const { render } = createRenderer();

  describe('prop: refs.elements', () => {
    it('cleans up refs on unmount', () => {
      function Item() {
        const { setRef } = useCompositeListItem();
        return <div ref={setRef} />;
      }

      const refs = {
        elements: [] as Array<HTMLElement | null>,
        labels: [] as Array<string | null>,
      };
      const { unmount } = render(() => (
        <CompositeList refs={refs}>
          <Item />
          <Item />
          <Item />
        </CompositeList>
      ));

      expect(refs.elements).to.have.length(3);
      expect(refs.labels).to.have.length(3);

      unmount();
      expect(refs.elements).to.have.length(0);
      expect(refs.labels).to.have.length(0);
    });
  });
});

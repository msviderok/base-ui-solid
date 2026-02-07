import { expectType } from '#test-utils';
import type { JSX } from 'solid-js';
import { Button } from '../button';
import type { HTMLProps } from '../utils/types';
import { useRender } from './useRender';

const element1 = useRender({
  render: () => <div>Test</div>,
});

expectType<(props?: HTMLProps) => JSX.Element, typeof element1>(element1);

const element2 = useRender({
  render: () => <div>Test</div>,
  enabled: true,
});

expectType<(props?: HTMLProps) => JSX.Element, typeof element2>(element2);

const element3 = useRender({
  render: () => <div>Test</div>,
  enabled: false,
});

expectType<(props?: HTMLProps) => null, typeof element3>(element3);

const element4 = useRender({
  render: () => <div>Test</div>,
  enabled: Math.random() > 0.5,
});

expectType<(props?: HTMLProps) => JSX.Element | null, typeof element4>(element4);

const element5 = useRender({
  render: () => <button type="button">Click</button>,
});

expectType<(props?: HTMLProps) => JSX.Element, typeof element5>(element5);

const element6 = useRender({
  render: 'div',
});

expectType<(props?: HTMLProps) => JSX.Element, typeof element6>(element6);

const element7 = useRender({
  render: (p) => <button {...p} type="button" aria-label="Submit" />,
  props: {
    class: 'btn-primary',
    onClick: () => console.log('clicked'),
  },
});

expectType<(props?: HTMLProps) => JSX.Element, typeof element7>(element7);

function App() {
  const element = useRender({ defaultTagName: 'div' });
  return <Button render={element} />;
}

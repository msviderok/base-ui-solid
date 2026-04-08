import { Suspense, useContext, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { DemoContext } from './DemoContext';

export function DemoPlayground(props: DemoPlayground.Props) {
  const demoContext = useContext(DemoContext);
  if (!demoContext) {
    throw new Error('Demo.Playground must be used within a Demo.Root');
  }

  return (
    <div {...props}>
      <Suspense>
        <Dynamic component={demoContext.selectedVariant().component} />
      </Suspense>
    </div>
  );
}

export namespace DemoPlayground {
  export interface Props extends JSX.HTMLAttributes<HTMLDivElement> {}
}

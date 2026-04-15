import { useContext, type ComponentProps } from 'solid-js';
import { DemoContext } from './DemoContext';
import { DemoSourceRenderer } from './DemoSourceRenderer';

export function DemoSourceBrowser(props: ComponentProps<'pre'>) {
  const demoContext = useContext(DemoContext);
  if (!demoContext) {
    throw new Error('Demo.Playground must be used within a Demo.Root');
  }

  const { selectedFile } = demoContext;

  return (
    <DemoSourceRenderer
      {...props}
      data-language={selectedFile().type}
      language={selectedFile().type}
      source={selectedFile().source ?? selectedFile().content}
    />
  );
}

export namespace DemoSourceBrowser {}

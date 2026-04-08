import { createEffect, createSignal, splitProps, type JSX } from 'solid-js';
import { DemoContext } from './DemoContext';
import { DemoFile, DemoVariant } from './types';

export function DemoRoot(props: DemoRoot.Props) {
  const [local, other] = splitProps(props, ['variants', 'children']);

  if (local.variants.length === 0) {
    throw new Error('No demo variants provided');
  }

  const [selectedVariant, setSelectedVariant] = createSignal(local.variants[0]);
  const [selectedFile, setSelectedFile] = createSignal<DemoFile>(selectedVariant().files[0]);

  createEffect(() => {
    setSelectedFile(selectedVariant().files[0]);
  });

  const contextValue: DemoContext = {
    variants: () => local.variants,
    selectedVariant,
    selectedFile,
    setSelectedVariant,
    setSelectedFile,
  };

  return (
    <DemoContext.Provider value={contextValue}>
      <div {...other}>{local.children}</div>
    </DemoContext.Provider>
  );
}

export namespace DemoRoot {
  export interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
    variants: DemoVariant[];
  }
}

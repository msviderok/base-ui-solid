import { createEffect, onCleanup } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import type { ProgressRoot } from '../root/ProgressRoot';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * An accessible label for the progress bar.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressLabel(componentProps: ProgressLabel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;

  const id = useBaseUiId(idProp);

  const { setLabelId, state } = useProgressRootContext();

  createEffect(() => {
    setLabelId(id());
    onCleanup(() => setLabelId(undefined));
  });

  const element = useRenderElement('span', componentProps, {
    state,
    props: [
      {
        get id() {
          return id();
        },
      },
      elementProps,
    ],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface ProgressLabelProps extends BaseUIComponentProps<'span', ProgressRoot.State> {}

export namespace ProgressLabel {
  export type Props = ProgressLabelProps;
}

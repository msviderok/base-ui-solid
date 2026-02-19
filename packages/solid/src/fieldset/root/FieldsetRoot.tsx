import { createSignal } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { FieldsetRootContext } from './FieldsetRootContext';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetRoot(componentProps: FieldsetRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled']);
  const disabled = () => local.disabled ?? false;

  const [legendId, setLegendId] = createSignal<string | undefined>();

  const state: FieldsetRoot.State = {
    get disabled() {
      return disabled();
    },
  };

  const contextValue: FieldsetRootContext = {
    legendId,
    setLegendId,
    disabled,
  };

  const element = useRenderElement('fieldset', componentProps, {
    state,
    props: [
      {
        get 'aria-labelledby'() {
          return legendId();
        },
      },
      elementProps,
    ],
  });

  return (
    <FieldsetRootContext.Provider value={contextValue}>{element()}</FieldsetRootContext.Provider>
  );
}

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}
export interface FieldsetRootProps extends BaseUIComponentProps<'fieldset', FieldsetRoot.State> {}

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
  export type Props = FieldsetRootProps;
}

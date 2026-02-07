'use client';
import { splitComponentProps } from '@msviderok/base-ui-solid/solid-helpers';
import { useCheckboxGroupContext } from '../../checkbox-group/CheckboxGroupContext';
import { LabelableProvider } from '../../labelable-provider';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { FieldRoot } from '../root/FieldRoot';
import { useFieldRootContext } from '../root/FieldRootContext';
import { fieldValidityMapping } from '../utils/constants';
import { FieldItemContext } from './FieldItemContext';

/**
 * Groups individual items in a checkbox group or radio group with a label and description.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldItem(componentProps: FieldItem.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled']);
  const disabledProp = () => local.disabled ?? false;

  const { state, disabled: rootDisabled } = useFieldRootContext(false);

  const disabled = () => rootDisabled() || disabledProp();

  const checkboxGroupContext = useCheckboxGroupContext();
  // checkboxGroupContext.parent is truthy even if no parent checkbox is involved
  const parentId = () => checkboxGroupContext?.parent.id();
  // this a more reliable check
  const hasParentCheckbox = () => checkboxGroupContext?.allValues() !== undefined;

  const initialControlId = () => (hasParentCheckbox() ? parentId() : undefined);

  const fieldItemContext: FieldItemContext = { disabled };

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping: fieldValidityMapping,
  });

  return (
    <LabelableProvider initialControlId={initialControlId()}>
      <FieldItemContext.Provider value={fieldItemContext}>{element()}</FieldItemContext.Provider>
    </LabelableProvider>
  );
}

export interface FieldItemProps extends BaseUIComponentProps<'div', FieldItem.State> {
  /**
   * Whether the wrapped control should ignore user interaction.
   * The `disabled` prop on `<Field.Root>` takes precedence over this.
   * @default false
   */
  disabled?: boolean;
}

export namespace FieldItem {
  export type State = FieldRoot.State;
  export type Props = FieldItemProps;
}

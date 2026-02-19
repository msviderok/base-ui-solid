import { splitComponentProps } from '../../solid-helpers';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDrawerProviderContext } from '../provider/DrawerProviderContext';

const stateAttributesMapping: StateAttributesMapping<DrawerIndentBackground.State> = {
  active(value): Record<string, string> | null {
    if (value) {
      return { 'data-active': '' };
    }
    return { 'data-inactive': '' };
  },
};

/**
 * An element placed before <Drawer.Indent> to render a background layer
 * that can be styled based on whether any drawer is open.
 */
export function DrawerIndentBackground(componentProps: DrawerIndentBackground.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const providerContext = useDrawerProviderContext(true);
  const active = () => providerContext?.active() ?? false;

  const state: DrawerIndentBackground.State = {
    get active() {
      return active();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface DrawerIndentBackgroundState {
  /**
   * Whether any drawer within the nearest <Drawer.Provider> is open.
   */
  active: boolean;
}

export interface DrawerIndentBackgroundProps extends BaseUIComponentProps<
  'div',
  DrawerIndentBackground.State
> {}

export namespace DrawerIndentBackground {
  export type State = DrawerIndentBackgroundState;
  export type Props = DrawerIndentBackgroundProps;
}

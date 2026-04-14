export { EMPTY_ARRAY, EMPTY_OBJECT, NOOP } from '@base-ui/utils/empty';
export { error, reset } from '@base-ui/utils/error';
export * from '@base-ui/utils/detectBrowser';
export * from '@base-ui/utils/fastHooks';
export * from '@base-ui/utils/fastObjectShallowCompare';
export { default as formatErrorMessage } from '@base-ui/utils/formatErrorMessage';
export { generateId } from '@base-ui/utils/generateId';
export { getReactElementRef } from '@base-ui/utils/getReactElementRef';
export { inertValue } from '@base-ui/utils/inertValue';
export { isElementDisabled } from '@base-ui/utils/isElementDisabled';
export { isMouseWithinBounds } from '@base-ui/utils/isMouseWithinBounds';
export { mergeObjects } from '@base-ui/utils/mergeObjects';
export { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
export { isReactVersionAtLeast } from '@base-ui/utils/reactVersion';
export { SafeReact } from '@base-ui/utils/safeReact';
export { expectType } from '@base-ui/utils/testUtils';
export type { IfEquals } from '@base-ui/utils/testUtils';
export { useForcedRerendering } from '@base-ui/utils/useForcedRerendering';
export { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
export { useMergedRefs, useMergedRefsN } from '@base-ui/utils/useMergedRefs';
export { useOnFirstRender } from '@base-ui/utils/useOnFirstRender';
export { useOnMount } from '@base-ui/utils/useOnMount';
export { useRefWithInit } from '@base-ui/utils/useRefWithInit';
export { useStableCallback } from '@base-ui/utils/useStableCallback';
export { useValueAsRef } from '@base-ui/utils/useValueAsRef';
export { warn } from '@base-ui/utils/warn';
export * from '@base-ui/utils/store';

export {
  TYPEAHEAD_RESET_MS,
  PATIENT_CLICK_THRESHOLD,
  DISABLED_TRANSITIONS_STYLE,
  CLICK_TRIGGER_IDENTIFIER,
  DROPDOWN_COLLISION_AVOIDANCE,
  POPUP_COLLISION_AVOIDANCE,
  ownerVisuallyHidden,
} from './constants';
export * from './areArraysEqual';
export * from './clamp';
export * from './collapsibleOpenStateMapping';
export * from './createBaseUIEventDetails';
export * from './formatNumber';
export * from './getCssDimensions';
export * from './getDisabledMountTransitionStyles';
export * from './getPseudoElementBounds';
export * from './getStateAttributesProps';
export * from './getStyleHookProps';
export * from './hideMiddleware';
export * from './itemEquality';
export * from './popups';
export * from './reason-parts';
export * from './reasons';
export * from './resolveClassName';
export * from './resolveRef';
export * from './resolveStyle';
export * from './resolveValueLabel';
export * from './scrollable';
export * from './serializeValue';
export * from './styleHookMapping';
export * from './styles';
export type * from './types';
export * from './useAnchorPositioning';
export * from './useAnimationFrame';
export * from './useAnimationsFinished';
export * from './useBaseUiId';
export * from './useControlled';
export * from './useEnhancedClickHandler';
export * from './useFocusableWhenDisabled';
export * from './useId';
export * from './useInterval';
export * from './useMixedToggleClickHandler';
export * from './useOpenChangeComplete';
export * from './useOpenInteractionType';
export * from './usePopupAutoResize';
export * from './usePopupViewport';
export * from './usePreviousValue';
export * from './useRenderElement';
export * from './useScrollLock';
export * from './useSwipeDismiss';
export * from './useTimeout';
export * from './useTransitionStatus';
export * from './valueToPercent';
export * from './visuallyHidden';

import { expectType } from '#test-utils';
import type { JSX } from 'solid-js';
import type { HTMLProps } from '../utils/types';
import { useRenderElement } from './useRenderElement';

const element1 = useRenderElement('div', {}, {});

expectType<(props?: HTMLProps) => JSX.Element, typeof element1>(element1);

const element2 = useRenderElement(
  'div',
  {},
  {
    enabled: true,
  },
);

expectType<(props?: HTMLProps) => JSX.Element, typeof element2>(element2);

const element3 = useRenderElement(
  'div',
  {},
  {
    enabled: false,
  },
);

expectType<(props?: HTMLProps) => null, typeof element3>(element3);

const element4 = useRenderElement(
  'div',
  {},
  {
    enabled: Math.random() > 0.5,
  },
);

expectType<(props?: HTMLProps) => JSX.Element, typeof element4>(element4);

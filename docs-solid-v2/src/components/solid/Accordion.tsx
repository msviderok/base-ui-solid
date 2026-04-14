import { observeScrollableInner } from '@/lib/observeScrollableInner';
import { callEventHandler } from '@msviderok/base-ui-solid';
import clsx from 'clsx';
import {
  createContext,
  onCleanup,
  onMount,
  splitProps,
  useContext,
  type ComponentProps,
  type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';

const ARROW_UP = 'ArrowUp';
const ARROW_DOWN = 'ArrowDown';
const ARROW_LEFT = 'ArrowLeft';
const ARROW_RIGHT = 'ArrowRight';
const HOME = 'Home';
const END = 'End';
const SUPPORTED_KEYS = new Set([ARROW_DOWN, ARROW_UP, ARROW_RIGHT, ARROW_LEFT, HOME, END]);

const AccordionContext = createContext<{ rootRef: HTMLElement | undefined }>();

export function Root(props: ComponentProps<'section'>) {
  const [local, rest] = splitProps(props, ['class']);
  let rootRef: HTMLElement | undefined;

  return (
    <AccordionContext.Provider
      value={{
        get rootRef() {
          return rootRef;
        },
      }}
    >
      <section ref={rootRef} class={clsx('AccordionRoot', local.class)} {...rest} />
    </AccordionContext.Provider>
  );
}

export function Trigger(
  props: ComponentProps<'summary'> & {
    index: number;
  },
) {
  const context = useContext(AccordionContext);
  const [local, rest] = splitProps(props, [
    'class',
    'index',
    'onKeyDown',
    'onClick',
    'onMouseDown',
  ]);

  return (
    <summary
      class={clsx('AccordionTrigger', local.class)}
      onKeyDown={(event) => {
        callEventHandler(local.onKeyDown, event);

        if (!context?.rootRef || !SUPPORTED_KEYS.has(event.key)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const triggers = context.rootRef.querySelectorAll<HTMLElement>('summary');
        const lastIndex = triggers.length - 1;
        let nextIndex = -1;

        switch (event.key) {
          case ARROW_LEFT:
          case ARROW_UP:
            nextIndex = local.index === 0 ? lastIndex : local.index - 1;
            break;
          case ARROW_RIGHT:
          case ARROW_DOWN:
            nextIndex = local.index + 1 > lastIndex ? 0 : local.index + 1;
            break;
          case HOME:
            nextIndex = 0;
            break;
          case END:
            nextIndex = lastIndex;
            break;
          default:
            break;
        }

        if (nextIndex > -1) {
          triggers.item(nextIndex)?.focus();
        }
      }}
      onClick={(event) => {
        const selection = window.getSelection();
        if (!selection?.isCollapsed) {
          event.preventDefault();
        }
        callEventHandler(local.onClick, event);
      }}
      onMouseDown={(event) => {
        if (!event.defaultPrevented && event.detail > 1) {
          event.preventDefault();
        }
        callEventHandler(local.onMouseDown, event);
      }}
      {...rest}
    />
  );
}

export function Item(
  props: ComponentProps<'details'> & {
    gaCategory?: string;
    gaLabel?: string;
    gaParams?: Record<string, string | number | boolean>;
  },
) {
  const [local, rest] = splitProps(props, ['class']);
  let ref: HTMLDetailsElement | undefined;

  onMount(() => {
    const triggerId = ref?.querySelector<HTMLElement>('summary')?.getAttribute('id');
    const hash = window.location.hash.slice(1);

    if (triggerId && hash === triggerId && ref) {
      ref.open = true;
    }
  });

  return <details ref={ref} class={clsx('AccordionItem', local.class)} {...rest} />;
}

export function Panel(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={clsx('AccordionPanel', local.class)} {...rest} />;
}

export function Content(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={clsx('AccordionContent', local.class)} {...rest} />;
}

export function Scrollable(
  props: ComponentProps<'span'> & {
    gradientColor?: string;
    tag?: keyof JSX.IntrinsicElements;
  },
) {
  const [local, rest] = splitProps(props, ['children', 'class', 'tag', 'gradientColor']);
  const Tag = local.tag ?? 'span';
  let ref: HTMLElement | undefined;

  onMount(() => {
    const cleanup = observeScrollableInner(ref ?? null);
    onCleanup(() => cleanup?.());
  });

  return (
    <Dynamic
      component={Tag}
      ref={ref}
      class={clsx('AccordionScrollable', local.class)}
      style={{ '--scrollable-gradient-color': local.gradientColor ?? 'var(--color-content)' }}
      {...rest}
    >
      <Dynamic component={Tag} class="AccordionScrollableInner">
        {local.children}
      </Dynamic>
    </Dynamic>
  );
}

export function HeaderRow(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div aria-hidden class={clsx('AccordionHeaderRow', local.class)} {...rest} />;
}

export function HeaderCell(props: ComponentProps<'div'>) {
  const [local, rest] = splitProps(props, ['class']);
  return <div class={clsx('AccordionHeaderCell', local.class)} {...rest} />;
}

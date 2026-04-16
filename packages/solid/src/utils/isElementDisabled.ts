export function isElementDisabled(element: HTMLElement | null | undefined) {
  return (
    element == null ||
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  );
}

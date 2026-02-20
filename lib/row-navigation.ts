const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [data-no-row-nav="true"]'

export function isInteractiveRowTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false

  const candidate = target as { closest?: (selector: string) => unknown }
  if (typeof candidate.closest !== 'function') return false

  return Boolean(candidate.closest(INTERACTIVE_SELECTOR))
}

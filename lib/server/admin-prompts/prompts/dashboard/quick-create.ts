import type { Prompt } from '../../types'

/** Evergreen "Quick create" affordance for the dashboard. Replaces
 *  the per-domain evergreens on the dashboard with a single
 *  unified picker. Always present. Drawer = `quick-create`. */
export function quickCreatePrompt(): Prompt {
  return {
    id: 'evergreen/quick-create',
    category: 'evergreen',
    kind: 'quick-create',
    severity: 'info',
    title: 'Quick create',
    body: 'Create a customer, order, deal, product, or anything else.',
    subjects: [],
    count: 0,
    cta: 'Create',
    action: { kind: 'drawer', drawerKind: 'quick-create' },
  }
}

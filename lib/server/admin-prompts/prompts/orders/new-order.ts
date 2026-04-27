import type { Prompt } from '../../types'

/** Evergreen "Create" affordance for the Orders page + dashboard.
 *  Drawer: `pick-customer-and-open-draft` — pick a customer + delivery
 *  date, then redirect to the order builder. */
export function newOrderPrompt(): Prompt {
  return {
    id: 'evergreen/new-order',
    category: 'evergreen',
    kind: 'new-order',
    severity: 'info',
    title: 'Open a new order draft',
    body: 'Pick a customer and a delivery date.',
    subjects: [],
    count: 0,
    cta: 'New order',
    action: { kind: 'drawer', drawerKind: 'pick-customer-and-open-draft' },
  }
}

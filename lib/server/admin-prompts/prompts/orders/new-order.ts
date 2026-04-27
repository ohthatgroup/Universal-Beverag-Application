import type { Moment } from '../../types'

/** Evergreen "Create" affordance for the Orders page + dashboard.
 *  Drawer: `pick-customer-and-open-draft` — pick a customer + delivery
 *  date, then redirect to the order builder. */
export function newOrderPrompt(): Moment {
  return {
    id: 'any-time/new-order',
    category: 'any-time',
    kind: 'new-order',
    narrative: 'Open a draft',
    subjects: [],
    primary: {
      label: 'New order',
      action: { kind: 'drawer', drawerKind: 'pick-customer-and-open-draft' },
    },
    secondary: [],
    weight: 0.1,
  }
}

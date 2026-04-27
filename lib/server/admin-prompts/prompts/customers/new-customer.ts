import type { Moment } from '../../types'

/** Evergreen "Create" affordance for the Customers page + dashboard.
 *  Always present. Drawer wraps the existing `<NewCustomerDialog>`. */
export function newCustomerPrompt(): Moment {
  return {
    id: 'any-time/new-customer',
    category: 'any-time',
    kind: 'new-customer',
    narrative: 'Add a customer',
    subjects: [],
    primary: {
      label: 'New customer',
      action: { kind: 'drawer', drawerKind: 'new-customer' },
    },
    secondary: [],
    weight: 0.1,
  }
}

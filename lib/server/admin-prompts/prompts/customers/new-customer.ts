import type { Prompt } from '../../types'

/** Evergreen "Create" affordance for the Customers page + dashboard.
 *  Always present. Drawer wraps the existing `<NewCustomerDialog>`. */
export function newCustomerPrompt(): Prompt {
  return {
    id: 'evergreen/new-customer',
    category: 'evergreen',
    kind: 'new-customer',
    severity: 'info',
    title: 'Add a new customer',
    body: 'Create a profile and provision a portal access link.',
    subjects: [],
    count: 0,
    cta: 'New customer',
    action: { kind: 'drawer', drawerKind: 'new-customer' },
  }
}

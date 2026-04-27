import type { Moment } from '../../types'

/** Evergreen create affordance for the Catalog page. */
export function newProductPrompt(): Moment {
  return {
    id: 'any-time/new-product',
    category: 'any-time',
    kind: 'new-product',
    narrative: 'Add a product',
    subjects: [],
    primary: {
      label: 'New product',
      action: { kind: 'drawer', drawerKind: 'new-product' },
    },
    secondary: [],
    weight: 0.1,
  }
}

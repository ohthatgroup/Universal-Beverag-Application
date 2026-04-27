import type { Prompt } from '../../types'

/** Evergreen create affordance for the Catalog page. */
export function newProductPrompt(): Prompt {
  return {
    id: 'evergreen/new-product',
    category: 'evergreen',
    kind: 'new-product',
    severity: 'info',
    title: 'Add a new product',
    body: 'Title, brand, pack, and price.',
    subjects: [],
    count: 0,
    cta: 'New product',
    action: { kind: 'drawer', drawerKind: 'new-product' },
  }
}

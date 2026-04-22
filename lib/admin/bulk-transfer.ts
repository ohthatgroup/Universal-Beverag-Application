import type { CsvRow } from '@/lib/utils'

export type BulkKind = 'customers' | 'products'

export interface BulkFieldDefinition {
  key: string
  label: string
  description: string
  requiredOnImport: boolean
  sample: string | number | boolean | null
  aliases?: string[]
}

export interface BulkDefinition {
  kind: BulkKind
  title: string
  description: string
  hint: string
  reviewHref: string
  reviewLabel: string
  templateFilename: string
  exportFilenamePrefix: string
  fields: BulkFieldDefinition[]
}

const CUSTOMER_FIELDS: BulkFieldDefinition[] = [
  {
    key: 'business_name',
    label: 'Business name',
    description: 'Shown as the primary customer name throughout admin and portal.',
    requiredOnImport: true,
    sample: 'Corner Deli',
    aliases: ['businessName', 'business', 'company', 'name'],
  },
  {
    key: 'contact_name',
    label: 'Contact name',
    description: 'Primary person for the account.',
    requiredOnImport: false,
    sample: 'Maya Ortiz',
    aliases: ['contactName', 'contact', 'owner'],
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Required to provision portal access.',
    requiredOnImport: true,
    sample: 'owner@cornerdeli.com',
    aliases: ['emailAddress', 'email_address'],
  },
  {
    key: 'phone',
    label: 'Phone',
    description: 'Customer contact phone number.',
    requiredOnImport: false,
    sample: '555-0101',
    aliases: ['phoneNumber', 'phone_number'],
  },
  {
    key: 'address',
    label: 'Address',
    description: 'Street address shown on the customer profile.',
    requiredOnImport: false,
    sample: '123 Main St',
    aliases: ['street', 'street_address'],
  },
  {
    key: 'city',
    label: 'City',
    description: 'City for the customer address.',
    requiredOnImport: false,
    sample: 'Brooklyn',
  },
  {
    key: 'state',
    label: 'State',
    description: 'State or province for the customer address.',
    requiredOnImport: false,
    sample: 'NY',
    aliases: ['province'],
  },
  {
    key: 'zip',
    label: 'Zip',
    description: 'Postal or zip code for the customer address.',
    requiredOnImport: false,
    sample: '11201',
    aliases: ['zipcode', 'postal', 'postalcode'],
  },
  {
    key: 'show_prices',
    label: 'Show prices',
    description: 'Controls whether catalog pricing is visible to the customer.',
    requiredOnImport: false,
    sample: true,
    aliases: ['showPrices'],
  },
  {
    key: 'custom_pricing',
    label: 'Custom pricing',
    description: 'Marks the customer as using customer-specific pricing.',
    requiredOnImport: false,
    sample: false,
    aliases: ['customPricing'],
  },
  {
    key: 'default_group',
    label: 'Default grouping',
    description: 'Customer portal grouping preference: brand or size.',
    requiredOnImport: false,
    sample: 'brand',
    aliases: ['defaultGroup', 'group'],
  },
]

const PRODUCT_FIELDS: BulkFieldDefinition[] = [
  {
    key: 'brand_name',
    label: 'Brand',
    description: 'Brand label used for the product. Missing brands are created automatically.',
    requiredOnImport: false,
    sample: 'Universal Beverages',
    aliases: ['brandName', 'brand'],
  },
  {
    key: 'title',
    label: 'Flavor / Details',
    description: 'Primary product title shown in the catalog.',
    requiredOnImport: true,
    sample: 'Lemon Lime Soda',
    aliases: ['product', 'productName', 'name'],
  },
  {
    key: 'pack_details',
    label: 'Pack details',
    description: 'Freeform pack text shown in the product card.',
    requiredOnImport: false,
    sample: '24/12 OZ',
    aliases: ['packDetails', 'pack', 'packLabel'],
  },
  {
    key: 'pack_count',
    label: 'Pack count',
    description: 'Structured pack count. Use together with size_value and size_uom.',
    requiredOnImport: false,
    sample: 24,
    aliases: ['packCount', 'caseCount'],
  },
  {
    key: 'size_value',
    label: 'Size value',
    description: 'Structured size value. Use together with pack_count and size_uom.',
    requiredOnImport: false,
    sample: 12,
    aliases: ['sizeValue', 'size'],
  },
  {
    key: 'size_uom',
    label: 'Size unit',
    description: 'Structured size unit such as OZ or ML.',
    requiredOnImport: false,
    sample: 'OZ',
    aliases: ['sizeUom', 'uom', 'unit'],
  },
  {
    key: 'price',
    label: 'Price',
    description: 'Unit price for the catalog product.',
    requiredOnImport: true,
    sample: 24.5,
    aliases: ['unitPrice', 'unit_price'],
  },
  {
    key: 'image_url',
    label: 'Image',
    description: 'Optional image URL for the product card.',
    requiredOnImport: false,
    sample: 'https://example.com/lemon-lime.jpg',
    aliases: ['imageUrl', 'image'],
  },
  {
    key: 'tags',
    label: 'Tags',
    description: 'Comma-separated tags from the product form.',
    requiredOnImport: false,
    sample: 'sparkling, citrus',
  },
  {
    key: 'is_new',
    label: 'New item',
    description: 'Marks the product as new in the catalog.',
    requiredOnImport: false,
    sample: false,
    aliases: ['isNew', 'new'],
  },
  {
    key: 'is_discontinued',
    label: 'Discontinued',
    description: 'Marks the product as discontinued.',
    requiredOnImport: false,
    sample: false,
    aliases: ['isDiscontinued', 'discontinued'],
  },
]

export const BULK_DEFINITIONS: Record<BulkKind, BulkDefinition> = {
  customers: {
    kind: 'customers',
    title: 'Bulk upload customers',
    description: 'Create customer profiles and portal access from a CSV export or pasted rows.',
    hint: 'Use the template to match the customer edit form fields exactly.',
    reviewHref: '/admin/customers',
    reviewLabel: 'Review customers',
    templateFilename: 'customer-import-template.csv',
    exportFilenamePrefix: 'customers-export',
    fields: CUSTOMER_FIELDS,
  },
  products: {
    kind: 'products',
    title: 'Bulk upload products',
    description: 'Create catalog products in bulk with the same fields used by the product form.',
    hint: 'Structured pack columns must be provided together, or use pack_details alone.',
    reviewHref: '/admin/catalog',
    reviewLabel: 'Review catalog',
    templateFilename: 'product-import-template.csv',
    exportFilenamePrefix: 'products-export',
    fields: PRODUCT_FIELDS,
  },
}

export function getBulkDefinition(kind: BulkKind): BulkDefinition {
  return BULK_DEFINITIONS[kind]
}

export function getBulkHeaders(kind: BulkKind): string[] {
  return BULK_DEFINITIONS[kind].fields.map((field) => field.key)
}

export function buildBulkTemplateRows(kind: BulkKind): { headers: string[]; rows: CsvRow[] } {
  const definition = BULK_DEFINITIONS[kind]
  const row = Object.fromEntries(
    definition.fields.map((field) => [field.key, field.sample])
  ) as CsvRow

  return {
    headers: getBulkHeaders(kind),
    rows: [row],
  }
}

export function listRequiredBulkFields(kind: BulkKind): BulkFieldDefinition[] {
  return BULK_DEFINITIONS[kind].fields.filter((field) => field.requiredOnImport)
}

export function listOptionalBulkFields(kind: BulkKind): BulkFieldDefinition[] {
  return BULK_DEFINITIONS[kind].fields.filter((field) => !field.requiredOnImport)
}

export function getBulkColumnsHelp(kind: BulkKind): string {
  const required = listRequiredBulkFields(kind).map((field) => field.key)
  const optional = listOptionalBulkFields(kind).map((field) => field.key)

  const pieces = [`Required: ${required.join(', ')}.`]
  if (optional.length > 0) {
    pieces.push(`Optional: ${optional.join(', ')}.`)
  }
  return pieces.join(' ')
}

export function normalizeBulkColumnKey(value: string): string {
  return value.replace(/[\s_-]+/g, '').toLowerCase()
}

export function getBulkField(kind: BulkKind, key: string): BulkFieldDefinition {
  const field = BULK_DEFINITIONS[kind].fields.find((candidate) => candidate.key === key)
  if (!field) {
    throw new Error(`Unknown bulk field "${key}" for ${kind}`)
  }
  return field
}

export function readBulkColumn(
  row: Record<string, string>,
  field: BulkFieldDefinition
): string {
  const aliasSet = new Set(
    [field.key, ...(field.aliases ?? [])].map(normalizeBulkColumnKey)
  )

  for (const [key, value] of Object.entries(row)) {
    if (aliasSet.has(normalizeBulkColumnKey(key))) {
      return value.trim()
    }
  }

  return ''
}

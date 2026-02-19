export type { Json, Database } from '@/lib/database.generated'

// ─── Profiles ─────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'salesman'
export type GroupByOption = 'brand' | 'size'

export interface Profile {
  id: string
  role: UserRole
  business_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  show_prices: boolean
  default_group: GroupByOption
  custom_pricing: boolean
  access_token: string | null
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  role: UserRole
  business_name?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  show_prices?: boolean
  default_group?: GroupByOption
  custom_pricing?: boolean
  access_token?: string | null
}

export type ProfileUpdate = Partial<ProfileInsert>

// ─── Brands ───────────────────────────────────────────────────────────────

export interface Brand {
  id: string
  name: string
  logo_url: string | null
  sort_order: number
  created_at: string
}

export interface BrandInsert {
  id?: string
  name: string
  logo_url?: string | null
  sort_order?: number
}

export type BrandUpdate = Partial<BrandInsert>

// ─── Products ─────────────────────────────────────────────────────────────

export interface Product {
  id: string
  brand_id: string | null
  title: string
  pack_details: string | null
  pack_count: number | null
  size_value: number | null
  size_uom: string | null
  price: number
  image_url: string | null
  is_new: boolean
  is_discontinued: boolean
  tags: string[] | null
  case_length: number | null
  case_width: number | null
  case_height: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProductInsert {
  id?: string
  brand_id?: string | null
  title: string
  pack_details?: string | null
  pack_count?: number | null
  size_value?: number | null
  size_uom?: string | null
  price: number
  image_url?: string | null
  is_new?: boolean
  is_discontinued?: boolean
  tags?: string[] | null
  case_length?: number | null
  case_width?: number | null
  case_height?: number | null
  sort_order?: number
}

export type ProductUpdate = Partial<ProductInsert>

// ─── Customer Products ────────────────────────────────────────────────────

export interface CustomerProduct {
  customer_id: string
  product_id: string
  excluded: boolean
  custom_price: number | null
}

export interface CustomerProductInsert {
  customer_id: string
  product_id: string
  excluded?: boolean
  custom_price?: number | null
}

export type CustomerProductUpdate = Partial<CustomerProductInsert>

// ─── Pallet Deals ─────────────────────────────────────────────────────────

export type PalletType = 'single' | 'mixed'

export interface PalletDeal {
  id: string
  title: string
  pallet_type: PalletType
  image_url: string | null
  price: number
  savings_text: string | null
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface PalletDealInsert {
  id?: string
  title: string
  pallet_type: PalletType
  image_url?: string | null
  price: number
  savings_text?: string | null
  description?: string | null
  is_active?: boolean
  sort_order?: number
}

export type PalletDealUpdate = Partial<PalletDealInsert>

// ─── Pallet Deal Items ────────────────────────────────────────────────────

export interface PalletDealItem {
  id: string
  pallet_deal_id: string
  product_id: string
  quantity: number
}

export interface PalletDealItemInsert {
  id?: string
  pallet_deal_id: string
  product_id: string
  quantity: number
}

export type PalletDealItemUpdate = Partial<PalletDealItemInsert>

// ─── Orders ───────────────────────────────────────────────────────────────

export type OrderStatus = 'draft' | 'submitted' | 'delivered'

export interface Order {
  id: string
  customer_id: string
  delivery_date: string // ISO date: YYYY-MM-DD
  status: OrderStatus
  total: number
  item_count: number
  submitted_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderInsert {
  id?: string
  customer_id: string
  delivery_date: string
  status?: OrderStatus
  total?: number
  item_count?: number
}

export type OrderUpdate = Partial<OrderInsert>

// ─── Order Items ──────────────────────────────────────────────────────────

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  pallet_deal_id: string | null
  quantity: number
  unit_price: number
  line_total: number // GENERATED ALWAYS AS (quantity * unit_price) STORED
}

export interface OrderItemInsert {
  id?: string
  order_id: string
  product_id?: string | null
  pallet_deal_id?: string | null
  quantity: number
  unit_price: number
}

export type OrderItemUpdate = Partial<OrderItemInsert>

// ─── Order Cutoffs ────────────────────────────────────────────────────────

export interface OrderCutoff {
  id: string
  cutoff_days: number
  cutoff_time: string // TIME as "HH:MM:SS"
  is_active: boolean
  created_at: string
}

export interface OrderCutoffInsert {
  id?: string
  cutoff_days?: number
  cutoff_time?: string
  is_active?: boolean
}

export type OrderCutoffUpdate = Partial<OrderCutoffInsert>

// ─── Product Cutoff Overrides ─────────────────────────────────────────────

export interface ProductCutoffOverride {
  product_id: string
  cutoff_days: number | null
  cutoff_time: string | null
}

export interface ProductCutoffOverrideInsert {
  product_id: string
  cutoff_days?: number | null
  cutoff_time?: string | null
}

export type ProductCutoffOverrideUpdate = Partial<ProductCutoffOverrideInsert>

// ─── Composite / Query Types ──────────────────────────────────────────────

// Product enriched with customer-specific data (returned by catalog query)
export interface CatalogProduct extends Product {
  custom_price: number | null
  brand?: Brand
  effective_price: number // custom_price ?? price
}

// Order item enriched with product/pallet details (for display)
export interface OrderItemDetail extends OrderItem {
  product: Product | null
  pallet_deal: PalletDeal | null
}

// Full order with all items expanded
export interface OrderWithItems extends Order {
  items: OrderItemDetail[]
  customer?: Profile
}

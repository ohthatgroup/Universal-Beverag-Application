'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Money } from '@/components/ui/money'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { EmptyState } from '@/components/ui/empty-state'
import type { OrderStatus } from '@/lib/types'

export interface HomeOrderRow {
  id: string
  customerName: string
  deliveryDate: string
  status: OrderStatus
  itemCount: number
  total: number
}

export interface HomeCustomerRow {
  id: string
  businessName: string
  email: string | null
  lastOrderDate: string | null
}

export interface HomeProductRow {
  id: string
  title: string
  brandName: string | null
  revenue?: number
  quantity?: number
}

export interface HomeBrandRow {
  id: string
  name: string
}

interface AdminHomeProps {
  recentOrders: HomeOrderRow[]
  recentCustomers: HomeCustomerRow[]
  topProducts: HomeProductRow[]
  allOrders: HomeOrderRow[]
  allCustomers: HomeCustomerRow[]
  allProducts: HomeProductRow[]
  allBrands: HomeBrandRow[]
}

function formatShortDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const SECTION_CAP = 5

export function AdminHome({
  recentOrders,
  recentCustomers,
  topProducts,
  allOrders,
  allCustomers,
  allProducts,
  allBrands,
}: AdminHomeProps) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const isSearching = term.length > 0

  const filteredOrders = useMemo(() => {
    if (!term) return []
    return allOrders
      .filter((o) =>
        [o.customerName, o.deliveryDate, o.status]
          .map((v) => (v ?? '').toLowerCase())
          .some((v) => v.includes(term))
      )
      .slice(0, SECTION_CAP)
  }, [allOrders, term])

  const filteredCustomers = useMemo(() => {
    if (!term) return []
    return allCustomers
      .filter((c) =>
        [c.businessName, c.email]
          .map((v) => (v ?? '').toLowerCase())
          .some((v) => v.includes(term))
      )
      .slice(0, SECTION_CAP)
  }, [allCustomers, term])

  const filteredProducts = useMemo(() => {
    if (!term) return []
    return allProducts
      .filter((p) =>
        [p.title, p.brandName]
          .map((v) => (v ?? '').toLowerCase())
          .some((v) => v.includes(term))
      )
      .slice(0, SECTION_CAP)
  }, [allProducts, term])

  const filteredBrands = useMemo(() => {
    if (!term) return []
    return allBrands
      .filter((b) => b.name.toLowerCase().includes(term))
      .slice(0, SECTION_CAP)
  }, [allBrands, term])

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers, orders, products, brands..."
          className="h-12 w-full rounded-2xl border bg-card/80 pl-12 pr-12 text-base shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isSearching ? (
        <SearchResults
          orders={filteredOrders}
          customers={filteredCustomers}
          products={filteredProducts}
          brands={filteredBrands}
          query={query}
        />
      ) : (
        <IdleHome
          recentOrders={recentOrders}
          recentCustomers={recentCustomers}
          topProducts={topProducts}
        />
      )}
    </div>
  )
}

function IdleHome({
  recentOrders,
  recentCustomers,
  topProducts,
}: {
  recentOrders: HomeOrderRow[]
  recentCustomers: HomeCustomerRow[]
  topProducts: HomeProductRow[]
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Recent orders" href="/admin/orders" hrefLabel="View all">
          {recentOrders.length === 0 ? (
            <EmptyState title="No recent orders" />
          ) : (
            <ul className="divide-y">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60"
                  >
                    <OrderStatusDot status={o.status} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {o.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatShortDate(o.deliveryDate)} · {o.itemCount} items
                      </div>
                    </div>
                    <div className="text-sm tabular-nums">
                      <Money value={o.total} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Recent customers"
          href="/admin/customers"
          hrefLabel="View all"
        >
          {recentCustomers.length === 0 ? (
            <EmptyState title="No recent customers" />
          ) : (
            <ul className="divide-y">
              {recentCustomers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {c.businessName}
                      </div>
                      {c.email && (
                        <div className="text-xs text-muted-foreground">
                          {c.email}
                        </div>
                      )}
                    </div>
                    {c.lastOrderDate && (
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(c.lastOrderDate)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Top products"
        href="/admin/catalog"
        hrefLabel="View catalog"
      >
        {topProducts.length === 0 ? (
          <EmptyState title="No product activity in the last 30 days" />
        ) : (
          <ul className="divide-y">
            {topProducts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/catalog`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.brandName ?? 'Unassigned brand'}
                    </div>
                  </div>
                  {typeof p.quantity === 'number' && (
                    <span className="text-xs text-muted-foreground">
                      {p.quantity} sold
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

function SearchResults({
  orders,
  customers,
  products,
  brands,
  query,
}: {
  orders: HomeOrderRow[]
  customers: HomeCustomerRow[]
  products: HomeProductRow[]
  brands: HomeBrandRow[]
  query: string
}) {
  const totalMatches =
    orders.length + customers.length + products.length + brands.length

  if (totalMatches === 0) {
    return (
      <EmptyState
        title="No matches"
        description={`Nothing matched "${query}".`}
      />
    )
  }

  return (
    <div className="space-y-6">
      {orders.length > 0 && (
        <SectionCard title="Orders">
          <ul className="divide-y">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60"
                >
                  <OrderStatusDot status={o.status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {o.customerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatShortDate(o.deliveryDate)} · {o.itemCount} items
                    </div>
                  </div>
                  <div className="text-sm tabular-nums">
                    <Money value={o.total} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {customers.length > 0 && (
        <SectionCard title="Customers">
          <ul className="divide-y">
            {customers.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {c.businessName}
                    </div>
                    {c.email && (
                      <div className="text-xs text-muted-foreground">
                        {c.email}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {products.length > 0 && (
        <SectionCard title="Products">
          <ul className="divide-y">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/catalog`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.brandName ?? 'Unassigned brand'}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {brands.length > 0 && (
        <SectionCard title="Brands">
          <ul className="divide-y">
            {brands.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/brands`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{b.name}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function SectionCard({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string
  href?: string
  hrefLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href && (
          <Link
            href={href}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {hrefLabel ?? 'View all'}
          </Link>
        )}
      </header>
      <div className="p-1">{children}</div>
    </section>
  )
}

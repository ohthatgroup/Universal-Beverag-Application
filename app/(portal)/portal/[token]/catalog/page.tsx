import { resolveCustomerToken } from '@/lib/server/customer-auth'
import { ManageUsualsList, type ManageUsualsProduct } from '@/components/portal/manage-usuals-list'
import { PortalPageHeader } from '@/components/portal/portal-page-header'

// TODO: replace with real catalog query + customer_products usuals join.
// See docs/handoff/homepage-redesign.md entry 16.
const MOCK_PRODUCTS: ManageUsualsProduct[] = [
  {
    id: 'p1',
    title: 'Coca-Cola Original',
    brandName: 'Coca-Cola',
    packLabel: '24/12oz cans',
    price: 38.99,
    imageUrl: null,
    isUsual: true,
  },
  {
    id: 'p2',
    title: 'Coca-Cola Zero Sugar',
    brandName: 'Coca-Cola',
    packLabel: '24/12oz cans',
    price: 38.99,
    imageUrl: null,
    isUsual: false,
  },
  {
    id: 'p3',
    title: 'Sprite',
    brandName: 'Coca-Cola',
    packLabel: '24/12oz cans',
    price: 38.99,
    imageUrl: null,
    isUsual: true,
  },
  {
    id: 'p4',
    title: 'Cherry Coke',
    brandName: 'Coca-Cola',
    packLabel: '24/12oz cans',
    price: 38.99,
    imageUrl: null,
    isUsual: false,
  },
  {
    id: 'p5',
    title: 'Dasani Purified Water',
    brandName: 'Coca-Cola',
    packLabel: '24/16.9oz bottles',
    price: 14.99,
    imageUrl: null,
    isUsual: true,
  },
  {
    id: 'p6',
    title: 'Monster Energy Original',
    brandName: 'Monster',
    packLabel: '24/16oz cans',
    price: 47.99,
    imageUrl: null,
    isUsual: true,
  },
  {
    id: 'p7',
    title: 'Monster Energy Zero Ultra',
    brandName: 'Monster',
    packLabel: '24/16oz cans',
    price: 47.99,
    imageUrl: null,
    isUsual: false,
  },
  {
    id: 'p8',
    title: 'Red Bull Energy',
    brandName: 'Red Bull',
    packLabel: '24/12oz cans',
    price: 51.99,
    imageUrl: null,
    isUsual: true,
  },
  {
    id: 'p9',
    title: 'Gatorade Cool Blue',
    brandName: 'Gatorade',
    packLabel: '12/28oz bottles',
    price: 22.99,
    imageUrl: null,
    isUsual: true,
  },
  {
    id: 'p10',
    title: 'Bai Coconut',
    brandName: 'Bai',
    packLabel: '12/18oz bottles',
    price: 24.0,
    imageUrl: null,
    isUsual: false,
  },
  {
    id: 'p11',
    title: 'Celsius Tropical Rush',
    brandName: 'Celsius',
    packLabel: '24/12oz cans',
    price: 38.99,
    imageUrl: null,
    isUsual: false,
  },
  {
    id: 'p12',
    title: 'AriZona Green Tea',
    brandName: 'AriZona',
    packLabel: '24/24oz cans',
    price: 18.0,
    imageUrl: null,
    isUsual: true,
  },
]

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  await resolveCustomerToken(token)

  return (
    <div className="space-y-6">
      <PortalPageHeader
        back={{ href: `/portal/${token}` }}
        title="Catalog"
        subtitle="Toggle items to keep them in your usuals"
      />
      <ManageUsualsList initialProducts={MOCK_PRODUCTS} />
    </div>
  )
}

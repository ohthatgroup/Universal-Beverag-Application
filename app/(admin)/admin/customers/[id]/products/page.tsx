import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function CustomerProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const [{ data: customer }, { data: products, error: productsError }, { data: overrides }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id,business_name,contact_name,custom_pricing')
        .eq('id', id)
        .eq('role', 'customer')
        .maybeSingle(),
      supabase
        .from('products')
        .select('id,title,pack_details,price,brand_id,is_discontinued')
        .order('title', { ascending: true }),
      supabase
        .from('customer_products')
        .select('product_id,excluded,custom_price')
        .eq('customer_id', id),
    ])

  if (productsError) {
    throw productsError
  }

  if (!customer) {
    notFound()
  }

  const overrideByProductId = new Map<string, any>(
    ((overrides ?? []) as any[]).map((entry) => [entry.product_id, entry])
  )

  async function updateProductSetting(formData: FormData) {
    'use server'

    const productId = formData.get('product_id') as string
    const excluded = formData.get('excluded') === 'on'
    const customPriceRaw = (formData.get('custom_price') as string | null)?.trim() ?? ''
    const customPrice = customPriceRaw.length > 0 ? Number(customPriceRaw) : null

    if (Number.isNaN(customPrice)) {
      throw new Error('Invalid custom price')
    }

    const supabaseClient = await createClient()

    if (!excluded && customPrice === null) {
      const { error } = await supabaseClient
        .from('customer_products')
        .delete()
        .eq('customer_id', id)
        .eq('product_id', productId)

      if (error) throw error
      redirect(`/admin/customers/${id}/products`)
    }

    const { error } = await supabaseClient.from('customer_products').upsert(
      {
        customer_id: id,
        product_id: productId,
        excluded,
        custom_price: customPrice,
      },
      {
        onConflict: 'customer_id,product_id',
      }
    )

    if (error) {
      throw error
    }

    redirect(`/admin/customers/${id}/products`)
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customer Product Manager</h1>
        <Link className="text-sm underline" href={`/admin/customers/${id}`}>
          Back to customer
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        {customer.business_name || customer.contact_name} • custom_pricing={String(customer.custom_pricing)}
      </p>

      <div className="space-y-3">
        {((products ?? []) as any[]).map((product) => {
          const override = overrideByProductId.get(product.id) as any
          const excluded = override?.excluded ?? false
          const customPrice = override?.custom_price ?? null

          return (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle className="text-base">{product.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateProductSetting} className="space-y-3">
                  <input type="hidden" name="product_id" value={product.id} />

                  <div className="text-xs text-muted-foreground">
                    {product.pack_details ?? 'N/A'} • Default ${Number(product.price).toFixed(2)}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="excluded" defaultChecked={excluded} />
                    Exclude product for this customer
                  </label>

                  <div className="space-y-2">
                    <Label htmlFor={`custom-price-${product.id}`}>Custom price</Label>
                    <Input
                      id={`custom-price-${product.id}`}
                      name="custom_price"
                      defaultValue={customPrice !== null ? String(customPrice) : ''}
                      placeholder="Leave blank to use default"
                    />
                  </div>

                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </form>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

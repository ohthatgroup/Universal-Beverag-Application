import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function BrandsPage() {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()

  const { data: brands, error } = await supabase
    .from('brands')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error

  async function createBrand(formData: FormData) {
    'use server'

    const name = (formData.get('name') as string).trim()
    if (!name) throw new Error('Brand name is required')

    const supabaseClient = await createClient()
    const { error: insertError } = await supabaseClient.from('brands').insert({
      name,
      logo_url: (formData.get('logo_url') as string) || null,
      sort_order: Number((formData.get('sort_order') as string) || 0),
    })

    if (insertError) throw insertError
    redirect('/admin/brands')
  }

  async function updateBrand(formData: FormData) {
    'use server'

    const id = formData.get('id') as string
    const supabaseClient = await createClient()

    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({
        name: (formData.get('name') as string).trim(),
        logo_url: (formData.get('logo_url') as string) || null,
        sort_order: Number((formData.get('sort_order') as string) || 0),
      })
      .eq('id', id)

    if (updateError) throw updateError
    redirect('/admin/brands')
  }

  const brandList = brands ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          Catalog
        </Link>
        <h1 className="text-2xl font-semibold">Brands</h1>
      </div>

      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-medium text-sm">
          <Plus className="h-4 w-4" />
          New Brand
        </summary>
        <div className="border-t p-4">
          <form action={createBrand} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input id="logo_url" name="logo_url" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort order</Label>
              <Input id="sort_order" name="sort_order" type="number" defaultValue={0} className="w-24" />
            </div>
            <div className="flex items-end">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </div>
      </details>

      {brandList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-0 md:hidden">
            {brandList.map((brand) => (
              <form key={brand.id} action={updateBrand} className="border-b py-3 last:border-0">
                <input type="hidden" name="id" value={brand.id} />
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input name="name" defaultValue={brand.name} className="h-8 text-sm" />
                    <Input name="logo_url" defaultValue={brand.logo_url ?? ''} placeholder="Logo URL" className="h-8 text-xs" />
                  </div>
                  <Input name="sort_order" type="number" defaultValue={brand.sort_order ?? 0} className="w-16 h-8 text-xs text-right" />
                  <Button size="sm" type="submit" variant="ghost" className="h-8 px-2 text-xs">Save</Button>
                </div>
              </form>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Logo URL</th>
                  <th className="px-4 py-2 text-right font-medium">Sort</th>
                  <th className="px-4 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {brandList.map((brand) => (
                  <tr key={brand.id} className="border-b last:border-0">
                    <td className="px-4 py-2" colSpan={4}>
                      <form action={updateBrand} className="flex items-center gap-4">
                        <input type="hidden" name="id" value={brand.id} />
                        <Input name="name" defaultValue={brand.name} className="h-8 text-sm flex-1" />
                        <Input name="logo_url" defaultValue={brand.logo_url ?? ''} placeholder="Logo URL" className="h-8 text-sm w-60" />
                        <Input name="sort_order" type="number" defaultValue={brand.sort_order ?? 0} className="h-8 text-sm text-right w-20" />
                        <Button size="sm" type="submit" variant="ghost" className="h-8 px-2 text-xs">Save</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

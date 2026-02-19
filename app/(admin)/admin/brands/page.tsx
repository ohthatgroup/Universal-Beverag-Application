import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploadField } from '@/components/ui/image-upload-field'
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
          <form action={createBrand} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort order</Label>
                <Input id="sort_order" name="sort_order" type="number" defaultValue={0} className="w-24" />
              </div>
              <div className="flex items-end">
                <Button type="submit">Create</Button>
              </div>
            </div>
            <ImageUploadField name="logo_url" label="Logo" folder="brands" />
          </form>
        </div>
      </details>

      {brandList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <div className="space-y-4">
          {brandList.map((brand) => (
            <form key={brand.id} action={updateBrand} className="rounded-lg border p-4 space-y-3">
              <input type="hidden" name="id" value={brand.id} />
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={brand.name} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Input name="sort_order" type="number" defaultValue={brand.sort_order ?? 0} className="h-9 text-sm w-20" />
                </div>
                <div className="flex items-end">
                  <Button size="sm" type="submit">Save</Button>
                </div>
              </div>
              <ImageUploadField name="logo_url" label="Logo" folder="brands" defaultValue={brand.logo_url} />
            </form>
          ))}
        </div>
      )}
    </div>
  )
}

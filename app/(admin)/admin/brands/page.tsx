import { redirect } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { createClient } from '@/lib/supabase/server'
import { requirePageAuth } from '@/lib/server/page-auth'

interface BrandsPageProps {
  searchParams?: Promise<{
    q?: string
  }>
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  await requirePageAuth(['salesman'])
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const searchQuery = (resolvedSearchParams?.q ?? '').trim()
  const searchTerm = searchQuery.toLowerCase()

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

  async function deleteBrand(formData: FormData) {
    'use server'

    await requirePageAuth(['salesman'])
    const id = String(formData.get('id') ?? '').trim()
    if (!id) throw new Error('Missing brand id')

    const supabaseClient = await createClient()
    const { error: unlinkError } = await supabaseClient
      .from('products')
      .update({ brand_id: null })
      .eq('brand_id', id)

    if (unlinkError) throw unlinkError

    const { error: deleteError } = await supabaseClient
      .from('brands')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    redirect('/admin/brands')
  }

  const brandList = (brands ?? []).filter((brand) => {
    if (!searchTerm) return true
    return brand.name.toLowerCase().includes(searchTerm)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
      </div>

      <div className="space-y-2 sm:flex sm:items-start sm:gap-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <details className="group rounded-md border">
            <summary className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm font-medium list-none">
              <Plus className="h-3.5 w-3.5" />
              New Brand
            </summary>
            <div className="border-t border-dashed p-4">
              <form action={createBrand} className="grid gap-3 md:grid-cols-[minmax(220px,320px)_auto_auto_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort order</Label>
                  <Input id="sort_order" name="sort_order" type="number" defaultValue={0} className="h-9 w-24" />
                </div>
                <ImageUploadField name="logo_url" label="Logo" folder="brands" compact iconOnly />
                <div className="flex items-end">
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </div>
          </details>
        </div>
        <div className="flex items-center gap-2">
          <LiveQueryInput
            placeholder="Search brands..."
            initialValue={searchQuery}
            className="w-full sm:w-80"
          />
        </div>
      </div>

      {brandList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <div className="space-y-4">
          {brandList.map((brand) => (
            <form key={brand.id} action={updateBrand} className="rounded-lg border p-4">
              <input type="hidden" name="id" value={brand.id} />
              <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_auto_auto_auto_auto] md:items-end">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={brand.name} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Input name="sort_order" type="number" defaultValue={brand.sort_order ?? 0} className="h-9 w-20 text-sm" />
                </div>
                <ImageUploadField name="logo_url" label="Logo" folder="brands" defaultValue={brand.logo_url} compact iconOnly />
                <div className="flex items-end gap-2">
                  <Button size="sm" type="submit">Save</Button>
                  <Button size="sm" type="submit" variant="destructive" formAction={deleteBrand}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  )
}

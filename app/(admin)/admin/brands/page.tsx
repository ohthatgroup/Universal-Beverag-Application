import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
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

  const brandList = (brands ?? []).filter((brand) => {
    if (!searchTerm) return true
    return brand.name.toLowerCase().includes(searchTerm)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <details className="group rounded-md border">
          <summary className="flex h-9 cursor-pointer items-center gap-2 px-3 text-sm font-medium list-none">
            <Plus className="h-3.5 w-3.5" />
            New Brand
          </summary>
          <div className="border-t p-4">
            <form action={createBrand} className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort order</Label>
                <Input id="sort_order" name="sort_order" type="number" defaultValue={0} className="w-24" />
              </div>
              <ImageUploadField name="logo_url" label="Logo" folder="brands" compact />
              <div className="flex items-end">
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </details>

        <LiveQueryInput
          placeholder="Search brands..."
          initialValue={searchQuery}
          className="w-full sm:w-80"
        />
      </div>

      {brandList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <div className="space-y-4">
          {brandList.map((brand) => (
            <form key={brand.id} action={updateBrand} className="rounded-lg border p-4">
              <input type="hidden" name="id" value={brand.id} />
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={brand.name} className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Input name="sort_order" type="number" defaultValue={brand.sort_order ?? 0} className="h-9 w-20 text-sm" />
                </div>
                <ImageUploadField name="logo_url" label="Logo" folder="brands" defaultValue={brand.logo_url} compact />
                <div className="flex items-end">
                  <Button size="sm" type="submit">Save</Button>
                </div>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  )
}

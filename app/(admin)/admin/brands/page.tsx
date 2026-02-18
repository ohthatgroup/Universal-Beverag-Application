import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  return (
    <div className="space-y-4 p-4 pb-20">
      <h1 className="text-2xl font-semibold">Brands</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Brand</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBrand} className="grid gap-3">
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
              <Input id="sort_order" name="sort_order" type="number" defaultValue={0} />
            </div>
            <Button type="submit">Create Brand</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Brands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(brands ?? []).map((brand) => (
            <form key={brand.id} action={updateBrand} className="space-y-2 rounded-md border p-3">
              <input type="hidden" name="id" value={brand.id} />
              <Input name="name" defaultValue={brand.name} />
              <Input name="logo_url" defaultValue={brand.logo_url ?? ''} placeholder="Logo URL" />
              <Input name="sort_order" type="number" defaultValue={brand.sort_order ?? 0} />
              <Button size="sm" type="submit">
                Save
              </Button>
            </form>
          ))}
          {(brands ?? []).length === 0 && <p className="text-sm text-muted-foreground">No brands found.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

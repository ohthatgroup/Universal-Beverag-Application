'use client'

import { useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Package2, Upload, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { buildCsv } from '@/lib/utils'

type ImportKind = 'customers' | 'products'

interface ImportOutcome {
  createdCount: number
  failedCount: number
  createdBrandCount?: number
  errors?: Array<{ lineNumber: number; message: string }>
}

const IMPORT_CONFIG: Record<
  ImportKind,
  {
    title: string
    description: string
    apiPath: string
    filename: string
    headers: string[]
    sampleRows: Array<Record<string, string | number | boolean | null>>
    columnsHelp: string
    hint: string
    reviewHref: string
    reviewLabel: string
    icon: typeof Users
  }
> = {
  customers: {
    title: 'Bulk upload customers',
    description: 'Create customer profiles and portal access links from a CSV or TSV file.',
    apiPath: '/api/admin/customers/import',
    filename: 'customer-import-template.csv',
    headers: ['businessName', 'email', 'contactName', 'phone', 'address', 'city', 'state', 'zip'],
    sampleRows: [
      {
        businessName: 'Corner Deli',
        email: 'owner@cornerdeli.com',
        contactName: 'Maya Ortiz',
        phone: '555-0101',
        address: '123 Main St',
        city: 'Brooklyn',
        state: 'NY',
        zip: '11201',
      },
    ],
    columnsHelp: 'Required: businessName, email. Optional: contactName, phone, address, city, state, zip.',
    hint: 'Each imported customer gets a portal profile and access link automatically.',
    reviewHref: '/admin/customers',
    reviewLabel: 'Review customers',
    icon: Users,
  },
  products: {
    title: 'Bulk upload products',
    description: 'Add catalog products in one pass. Missing brands are created automatically.',
    apiPath: '/api/admin/products/import',
    filename: 'product-import-template.csv',
    headers: ['title', 'brandName', 'price', 'packDetails', 'packCount', 'sizeValue', 'sizeUom', 'imageUrl', 'isNew'],
    sampleRows: [
      {
        title: 'Lemon Lime Soda',
        brandName: 'Universal Beverages',
        price: 24.5,
        packDetails: '24/12 OZ',
        packCount: 24,
        sizeValue: 12,
        sizeUom: 'OZ',
        imageUrl: '',
        isNew: false,
      },
    ],
    columnsHelp:
      'Required: title, price. Optional: brandName, packDetails, imageUrl, isNew. Structured pack fields require packCount + sizeValue + sizeUom together.',
    hint: 'Supported size units: OZ, ML, LITER, LITERS, GALLON, GALLONS, CT, ROLL, ROLLS.',
    reviewHref: '/admin/catalog',
    reviewLabel: 'Review catalog',
    icon: Package2,
  },
}

function downloadTemplate(kind: ImportKind) {
  const config = IMPORT_CONFIG[kind]
  const csv = buildCsv(config.sampleRows, config.headers)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = config.filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function BulkUploadPanel() {
  const router = useRouter()
  const [activeKind, setActiveKind] = useState<ImportKind | null>(null)
  const [rawText, setRawText] = useState('')
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const activeConfig = activeKind ? IMPORT_CONFIG[activeKind] : null

  const resetDialog = () => {
    setRawText('')
    setLoadedFileName(null)
    setSubmitError(null)
    setOutcome(null)
    setSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveKind(null)
      resetDialog()
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setRawText(text)
      setLoadedFileName(file.name)
      setSubmitError(null)
      setOutcome(null)
    } catch {
      setSubmitError('Unable to read that file. Try a CSV or TSV export.')
    } finally {
      event.target.value = ''
    }
  }

  const handleImport = async () => {
    if (!activeConfig || !rawText.trim()) {
      setSubmitError('Paste CSV/TSV data or choose a file first.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setOutcome(null)

    try {
      const response = await fetch(activeConfig.apiPath, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          raw: rawText,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { data?: ImportOutcome; error?: { message?: string } }
        | null

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Import failed')
      }

      setOutcome(payload.data)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Bulk Upload</h2>
          <p className="text-sm text-muted-foreground">
            Upload CSV or TSV files directly from the admin landing page.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(IMPORT_CONFIG) as Array<[ImportKind, (typeof IMPORT_CONFIG)[ImportKind]]>).map(
            ([kind, config]) => {
              const Icon = config.icon

              return (
                <Card key={kind}>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted p-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <CardTitle className="text-base">{config.title}</CardTitle>
                    </div>
                    <CardDescription>{config.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">{config.columnsHelp}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => setActiveKind(kind)}>
                        <Upload className="mr-1.5 h-4 w-4" />
                        Upload
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => downloadTemplate(kind)}>
                        <Download className="mr-1.5 h-4 w-4" />
                        Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            }
          )}
        </div>
      </div>

      <Dialog open={activeKind !== null} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeConfig?.title}</DialogTitle>
            <DialogDescription>
              {activeConfig?.hint}
            </DialogDescription>
          </DialogHeader>

          {activeConfig && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-upload-file">CSV or TSV file</Label>
                <Input
                  id="bulk-upload-file"
                  type="file"
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  onChange={handleFileChange}
                />
                {loadedFileName && (
                  <p className="text-xs text-muted-foreground">Loaded: {loadedFileName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-upload-text">Paste rows</Label>
                <Textarea
                  id="bulk-upload-text"
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder={activeConfig.headers.join(',')}
                  className="min-h-[220px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">{activeConfig.columnsHelp}</p>
              </div>

              {submitError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              {outcome && (
                <div className="space-y-2 rounded-md border bg-muted/30 px-3 py-3 text-sm">
                  <p className="font-medium">
                    Imported {outcome.createdCount} row{outcome.createdCount === 1 ? '' : 's'}.
                    {outcome.failedCount > 0 ? ` ${outcome.failedCount} row${outcome.failedCount === 1 ? '' : 's'} failed.` : ''}
                  </p>
                  {typeof outcome.createdBrandCount === 'number' && outcome.createdBrandCount > 0 && (
                    <p className="text-muted-foreground">
                      Created {outcome.createdBrandCount} new brand{outcome.createdBrandCount === 1 ? '' : 's'}.
                    </p>
                  )}
                  {outcome.errors && outcome.errors.length > 0 && (
                    <ul className="space-y-1 text-xs text-destructive">
                      {outcome.errors.map((error) => (
                        <li key={`${error.lineNumber}-${error.message}`}>
                          Line {error.lineNumber}: {error.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={activeConfig.reviewHref}
                    className="inline-flex text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {activeConfig.reviewLabel}
                  </Link>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Close
            </Button>
            {activeKind && (
              <Button type="button" onClick={handleImport} disabled={submitting}>
                {submitting ? 'Importing...' : `Import ${IMPORT_CONFIG[activeKind].title.replace('Bulk upload ', '')}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

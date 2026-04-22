'use client'

import { useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Package2, Upload, Users } from 'lucide-react'
import {
  BULK_DEFINITIONS,
  getBulkColumnsHelp,
  type BulkDefinition,
  type BulkKind,
} from '@/lib/admin/bulk-transfer'
import { Button } from '@/components/ui/button'
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

interface ImportOutcome {
  createdCount: number
  failedCount: number
  createdBrandCount?: number
  errors?: Array<{ lineNumber: number; message: string }>
}

const BULK_ICONS: Record<BulkKind, typeof Users> = {
  customers: Users,
  products: Package2,
}

function extractFilename(disposition: string | null, fallback: string) {
  if (!disposition) return fallback

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] ?? fallback
}

async function downloadCsv(url: string, fallbackFilename: string) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    throw new Error(payload?.error?.message ?? 'Download failed')
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = extractFilename(
    response.headers.get('content-disposition'),
    fallbackFilename
  )
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(blobUrl)
}

export function BulkUploadPanel() {
  const router = useRouter()
  const [activeKind, setActiveKind] = useState<BulkKind | null>(null)
  const [rawText, setRawText] = useState('')
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)

  const activeDefinition = activeKind ? BULK_DEFINITIONS[activeKind] : null

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
    if (!activeKind || !activeDefinition || !rawText.trim()) {
      setSubmitError('Paste CSV/TSV data or choose a file first.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setOutcome(null)

    try {
      const response = await fetch(`/api/admin/${activeKind}/import`, {
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

  const handleDownload = async (kind: BulkKind, mode: 'template' | 'export') => {
    const definition = BULK_DEFINITIONS[kind]
    const key = `${kind}:${mode}`
    setDownloadError(null)
    setDownloadingKey(key)

    try {
      await downloadCsv(
        mode === 'template'
          ? `/api/admin/${kind}/export?mode=template`
          : `/api/admin/${kind}/export`,
        mode === 'template'
          ? definition.templateFilename
          : `${definition.exportFilenamePrefix}.csv`
      )
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setDownloadingKey(null)
    }
  }

  return (
    <>
      <div className="space-y-2">
        {downloadError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {downloadError}
          </div>
        )}

        <ul className="divide-y rounded-xl border bg-card">
          {(Object.entries(BULK_DEFINITIONS) as Array<[BulkKind, BulkDefinition]>).map(
            ([kind, definition]) => {
              const Icon = BULK_ICONS[kind]

              return (
                <li
                  key={kind}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{definition.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {definition.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDownload(kind, 'export')}
                      disabled={downloadingKey !== null}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      {downloadingKey === `${kind}:export` ? 'Downloading…' : 'Export'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDownload(kind, 'template')}
                      disabled={downloadingKey !== null}
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      {downloadingKey === `${kind}:template` ? 'Downloading…' : 'Template'}
                    </Button>
                    <Button type="button" size="sm" onClick={() => setActiveKind(kind)}>
                      <Upload className="mr-1.5 h-4 w-4" />
                      Import
                    </Button>
                  </div>
                </li>
              )
            }
          )}
        </ul>
      </div>

      <Dialog open={activeKind !== null} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeDefinition?.title}</DialogTitle>
            <DialogDescription>{activeDefinition?.hint}</DialogDescription>
          </DialogHeader>

          {activeKind && activeDefinition && (
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
                  placeholder={activeDefinition.fields.map((field) => field.key).join(',')}
                  className="min-h-[220px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">{getBulkColumnsHelp(activeKind)}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {activeDefinition.fields.map((field) => (
                  <div key={field.key} className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                    <div className="font-mono font-medium">
                      {field.key}
                      {field.requiredOnImport ? ' *' : ''}
                    </div>
                    <div className="mt-1 text-muted-foreground">{field.description}</div>
                  </div>
                ))}
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
                    {outcome.failedCount > 0
                      ? ` ${outcome.failedCount} row${outcome.failedCount === 1 ? '' : 's'} failed.`
                      : ''}
                  </p>
                  {typeof outcome.createdBrandCount === 'number' && outcome.createdBrandCount > 0 && (
                    <p className="text-muted-foreground">
                      Created {outcome.createdBrandCount} new brand
                      {outcome.createdBrandCount === 1 ? '' : 's'}.
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
                    href={activeDefinition.reviewHref}
                    className="inline-flex text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {activeDefinition.reviewLabel}
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
                {submitting ? 'Importing...' : `Import ${activeKind}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

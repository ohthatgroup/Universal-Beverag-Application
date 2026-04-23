'use client'

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Copy, MoreVertical, Package2, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AdminFab } from '@/components/admin/admin-fab'
import { DestructiveConfirmDialog } from '@/components/ui/destructive-confirm-dialog'
import { buildCustomerPortalBasePath } from '@/lib/portal-links'

interface Ctx {
  customerId: string
  portalUrl: string | null
  copied: boolean
  copyPortal: () => void
  regenerateToken: () => void
  startOrder: () => void
  deleteCustomer: () => void
  isPending: boolean
  hasDraftToday: boolean
  todayLabel: string
}

const CustomerActionsContext = createContext<Ctx | null>(null)

function useCtx() {
  const v = useContext(CustomerActionsContext)
  if (!v) throw new Error('CustomerActions components must be used within CustomerActionsProvider')
  return v
}

interface ProviderProps {
  customerId: string
  accessToken: string | null
  hasDraftToday: boolean
  todayLabel: string
  startOrderAction: () => Promise<void>
  deleteCustomerAction: () => Promise<void>
  children: ReactNode
}

export function CustomerActionsProvider({
  customerId,
  accessToken,
  hasDraftToday,
  todayLabel,
  startOrderAction,
  deleteCustomerAction,
  children,
}: ProviderProps) {
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState(accessToken)
  const [origin, setOrigin] = useState<string>('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const portalPath = buildCustomerPortalBasePath(token)
  const portalUrl = portalPath && origin ? `${origin}${portalPath}` : null

  const copyPortal = async () => {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const regenerateToken = async () => {
    const res = await fetch(`/api/customers/${customerId}/regenerate-token`, { method: 'POST' })
    const payload = (await res.json().catch(() => null)) as
      | { data?: { access_token?: string | null } }
      | null
    if (res.ok) {
      setToken(payload?.data?.access_token ?? null)
    }
  }

  const startOrder = () => startTransition(async () => { await startOrderAction() })
  const deleteCustomer = () => {
    startTransition(async () => { await deleteCustomerAction() })
  }

  return (
    <CustomerActionsContext.Provider
      value={{
        customerId,
        portalUrl,
        copied,
        copyPortal,
        regenerateToken,
        startOrder,
        deleteCustomer,
        isPending,
        hasDraftToday,
        todayLabel,
      }}
    >
      {children}
    </CustomerActionsContext.Provider>
  )
}

export function CustomerOverflowMenu() {
  const router = useRouter()
  const { customerId, regenerateToken, deleteCustomer, isPending } = useCtx()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="More actions"
            className="h-9 w-9"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(`/admin/customers/${customerId}/edit`)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push(`/admin/customers/${customerId}/products`)}>
            <Package2 className="mr-2 h-3.5 w-3.5" />
            Products &amp; visibility
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void regenerateToken() }}>
            <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            Regenerate portal token
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setConfirmOpen(true) }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete customer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DestructiveConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete customer?"
        description="This permanently removes the customer and all associated data. This cannot be undone."
        confirmLabel="Delete customer"
        pendingLabel="Deleting…"
        pending={isPending}
        onConfirm={() => {
          setConfirmOpen(false)
          deleteCustomer()
        }}
      />
    </>
  )
}

export function CustomerEditButton() {
  const { customerId } = useCtx()
  return (
    <Button
      asChild
      type="button"
      variant="outline"
      size="icon"
      aria-label="Edit customer details"
      className="h-9 w-9"
    >
      <Link href={`/admin/customers/${customerId}/edit`}>
        <Pencil className="h-4 w-4" />
      </Link>
    </Button>
  )
}

export function CustomerStartOrderButton() {
  const { startOrder, isPending, hasDraftToday } = useCtx()
  return (
    <AdminFab
      icon={<Plus className="h-6 w-6" />}
      label={hasDraftToday ? 'Continue draft order' : 'Start order'}
      onClick={startOrder}
      disabled={isPending}
    />
  )
}

export function CustomerSharePortalMenu() {
  const { portalUrl, copied, copyPortal } = useCtx()
  const disabled = !portalUrl

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => void copyPortal()}
      className="h-9"
    >
      {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
      {copied ? 'Copied' : 'Copy portal link'}
    </Button>
  )
}

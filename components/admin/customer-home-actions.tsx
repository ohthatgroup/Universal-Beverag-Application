'use client'

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, MoreVertical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    if (!window.confirm('Delete this customer? This cannot be undone.')) return
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
  const { customerId, copied, portalUrl, copyPortal, regenerateToken, deleteCustomer } = useCtx()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More actions" className="-mr-2">
          {copied ? <Check className="h-5 w-5 text-green-600" /> : <MoreVertical className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customerId}/edit`)}>
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customerId}/products`)}>
          Visibility &amp; pricing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyPortal} disabled={!portalUrl}>
          Copy portal link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={regenerateToken}>Regenerate portal link</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={deleteCustomer}
          className="text-destructive focus:text-destructive"
        >
          Delete customer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CustomerStartOrderButton() {
  const { startOrder, isPending, hasDraftToday } = useCtx()
  return (
    <button
      type="button"
      onClick={startOrder}
      disabled={isPending}
      className="flex w-full items-center gap-3 rounded-2xl bg-primary px-6 py-5 text-left text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60"
    >
      <Plus className="h-5 w-5" />
      <span className="text-base font-semibold">
        {hasDraftToday ? 'Continue draft' : 'Start order'}
      </span>
    </button>
  )
}

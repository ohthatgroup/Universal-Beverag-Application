'use client'

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, Copy, Mail, MessageSquare, MoreVertical, Pencil, Plus, RefreshCcw, Share2, Trash2 } from 'lucide-react'
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
  const { regenerateToken, deleteCustomer } = useCtx()

  return (
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
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void regenerateToken() }}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Regenerate portal token
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); deleteCustomer() }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete customer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
    <Button
      type="button"
      onClick={startOrder}
      disabled={isPending}
      className="gap-2"
    >
      <Plus className="h-4 w-4" />
      {hasDraftToday ? 'Continue draft' : 'Start order'}
    </Button>
  )
}

export function CustomerSharePortalMenu() {
  const { portalUrl, copied, copyPortal, regenerateToken } = useCtx()
  const disabled = !portalUrl

  const smsHref = portalUrl ? `sms:?body=${encodeURIComponent(`Your portal: ${portalUrl}`)}` : '#'
  const mailHref = portalUrl
    ? `mailto:?subject=${encodeURIComponent('Your portal access')}&body=${encodeURIComponent(`Your portal link: ${portalUrl}`)}`
    : '#'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label="Share portal link"
          className="h-9 w-9"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void copyPortal() }} disabled={disabled}>
          {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy portal link'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void regenerateToken() }}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Regenerate link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild disabled={disabled}>
          <a href={smsHref}>
            <MessageSquare className="mr-2 h-3.5 w-3.5" />
            Share via SMS
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild disabled={disabled}>
          <a href={mailHref}>
            <Mail className="mr-2 h-3.5 w-3.5" />
            Share via email
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

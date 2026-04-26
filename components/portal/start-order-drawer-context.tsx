'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import {
  StartOrderDrawer,
  type RecentOrderForDrawer,
} from '@/components/portal/start-order-drawer'

interface DrawerData {
  token: string
  nextDeliveryDate: string
  nextNextDeliveryDate: string
  primaryDraft: {
    id: string
    deliveryDate: string
    itemCount: number
  } | null
  recentOrders: RecentOrderForDrawer[]
  usualsCount: number
}

interface DrawerContextValue {
  open: () => void
  close: () => void
  isOpen: boolean
}

const StartOrderDrawerContext = createContext<DrawerContextValue | null>(null)

interface StartOrderDrawerProviderProps {
  children: React.ReactNode
  data: DrawerData
}

/**
 * Holds the Start-Order drawer state at the layout level, so any portal
 * page can call `useStartOrderDrawer().open()` without duplicating the
 * drawer DOM.
 */
export function StartOrderDrawerProvider({
  children,
  data,
}: StartOrderDrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <StartOrderDrawerContext.Provider value={{ open, close, isOpen }}>
      {children}
      <StartOrderDrawer
        open={isOpen}
        onOpenChange={setIsOpen}
        token={data.token}
        nextDeliveryDate={data.nextDeliveryDate}
        nextNextDeliveryDate={data.nextNextDeliveryDate}
        primaryDraft={data.primaryDraft}
        recentOrders={data.recentOrders}
        usualsCount={data.usualsCount}
      />
    </StartOrderDrawerContext.Provider>
  )
}

export function useStartOrderDrawer(): DrawerContextValue {
  const ctx = useContext(StartOrderDrawerContext)
  if (!ctx) {
    throw new Error(
      'useStartOrderDrawer must be used inside <StartOrderDrawerProvider>',
    )
  }
  return ctx
}

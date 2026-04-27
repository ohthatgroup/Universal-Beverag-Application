'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { Moment } from '@/lib/server/admin-prompts'

export interface MomentDrawerProps {
  moment: Moment
  onClose: () => void
  /** Drawer calls when its mutation succeeded. Routes a
   *  `router.refresh()` so the moment list re-resolves. */
  onCompleted: () => void
}

export type MomentDrawerComponent = ComponentType<MomentDrawerProps>

interface DrawerContextValue {
  open: (drawerKind: string, moment: Moment) => void
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

export function usePromptDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext)
  if (!ctx) {
    throw new Error(
      'usePromptDrawer must be used within <PromptDrawerProvider>',
    )
  }
  return ctx
}

interface ProviderProps {
  registry: Record<string, MomentDrawerComponent>
  fallback?: MomentDrawerComponent
  children: ReactNode
}

interface ActiveDrawer {
  kind: string
  moment: Moment
}

/**
 * Drawer dispatch root. Holds the active drawer state and renders
 * the registered component when one is open. Slotted into the admin
 * tree once via `<AdminClientShell>` — every moment card consumes
 * `usePromptDrawer().open(kind, moment)` to fire a drawer.
 *
 * If a kind isn't registered, the drawer silently does nothing and
 * logs a console warning.
 */
export function PromptDrawerProvider({ registry, fallback, children }: ProviderProps) {
  const [active, setActive] = useState<ActiveDrawer | null>(null)
  const router = useRouter()

  const open = useCallback(
    (drawerKind: string, moment: Moment) => {
      if (!registry[drawerKind]) {
        // eslint-disable-next-line no-console
        console.warn(`[promptDrawer] unknown drawerKind: ${drawerKind}`)
      }
      setActive({ kind: drawerKind, moment })
    },
    [registry],
  )

  const onClose = useCallback(() => setActive(null), [])
  const onCompleted = useCallback(() => {
    setActive(null)
    router.refresh()
  }, [router])

  const value = useMemo<DrawerContextValue>(() => ({ open }), [open])
  const Component = active ? (registry[active.kind] ?? fallback ?? null) : null

  return (
    <DrawerContext.Provider value={value}>
      {children}
      {Component && active && (
        <Component
          moment={active.moment}
          onClose={onClose}
          onCompleted={onCompleted}
        />
      )}
    </DrawerContext.Provider>
  )
}

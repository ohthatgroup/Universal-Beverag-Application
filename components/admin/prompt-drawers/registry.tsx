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
import type { Prompt } from '@/lib/server/admin-prompts'

export interface PromptDrawerProps {
  prompt: Prompt
  onClose: () => void
  /** Drawer calls when its mutation succeeded. Routes a
   *  `router.refresh()` so the prompt list re-resolves. */
  onCompleted: () => void
}

export type PromptDrawerComponent = ComponentType<PromptDrawerProps>

interface DrawerContextValue {
  open: (drawerKind: string, prompt: Prompt) => void
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
  registry: Record<string, PromptDrawerComponent>
  children: ReactNode
}

interface ActiveDrawer {
  kind: string
  prompt: Prompt
}

/**
 * Drawer dispatch root. Holds the active drawer state and renders
 * the registered component when one is open. Slotted into the admin
 * tree once via `<AdminClientShell>` — every prompt card consumes
 * `usePromptDrawer().open(kind, prompt)` to fire a drawer.
 *
 * If a kind isn't registered, the drawer silently does nothing and
 * logs a console warning. Slice 4 fills the registry; before then
 * the stub drawer covers all kinds.
 */
export function PromptDrawerProvider({ registry, children }: ProviderProps) {
  const [active, setActive] = useState<ActiveDrawer | null>(null)
  const router = useRouter()

  const open = useCallback(
    (drawerKind: string, prompt: Prompt) => {
      if (!registry[drawerKind]) {
        // eslint-disable-next-line no-console
        console.warn(`[promptDrawer] unknown drawerKind: ${drawerKind}`)
      }
      setActive({ kind: drawerKind, prompt })
    },
    [registry],
  )

  const onClose = useCallback(() => setActive(null), [])
  const onCompleted = useCallback(() => {
    setActive(null)
    router.refresh()
  }, [router])

  const value = useMemo<DrawerContextValue>(() => ({ open }), [open])
  const Component = active ? registry[active.kind] : null

  return (
    <DrawerContext.Provider value={value}>
      {children}
      {Component && active && (
        <Component
          prompt={active.prompt}
          onClose={onClose}
          onCompleted={onCompleted}
        />
      )}
    </DrawerContext.Provider>
  )
}

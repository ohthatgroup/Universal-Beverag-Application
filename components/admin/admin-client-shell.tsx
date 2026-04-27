'use client'

import type { ReactNode } from 'react'
import { PromptDrawerProvider } from '@/components/admin/prompt-drawers/registry'
import { promptDrawerRegistry, StubDrawer } from '@/components/admin/prompt-drawers'

/**
 * Client island mounted from `app/(admin)/layout.tsx`. Sets up the
 * prompt-drawer dispatcher so any `<PromptBundleCard>` in the tree
 * can call `usePromptDrawer().open(...)` to fire a drawer.
 *
 * The admin layout itself stays a server component; this shell is
 * the only client wrapper.
 */
export function AdminClientShell({ children }: { children: ReactNode }) {
  return (
    <PromptDrawerProvider registry={promptDrawerRegistry} fallback={StubDrawer}>
      {children}
    </PromptDrawerProvider>
  )
}

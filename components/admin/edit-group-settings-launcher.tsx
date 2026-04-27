'use client'

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  EditGroupSettingsModal,
} from '@/components/admin/edit-group-settings-modal'
import type { GroupOverrideRow } from '@/components/admin/group-overrides-panel'

interface LauncherProps {
  customerId: string
  customerBusinessName: string
  groupId: string
  groupName: string
  memberCount: number
  rows: GroupOverrideRow[]
}

/**
 * Thin client wrapper that owns the modal's open state. Lives next to
 * the customer detail page's existing settings section. Server page
 * renders this with all the data the modal needs (group + override rows
 * + member count).
 */
export function EditGroupSettingsLauncher(props: LauncherProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Edit group settings
      </Button>
      <EditGroupSettingsModal
        open={open}
        onOpenChange={setOpen}
        customerId={props.customerId}
        customerBusinessName={props.customerBusinessName}
        groupId={props.groupId}
        groupName={props.groupName}
        memberCount={props.memberCount}
        rows={props.rows}
      />
    </>
  )
}

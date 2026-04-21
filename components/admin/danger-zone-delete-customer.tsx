'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DangerZoneDeleteCustomerProps {
  businessName: string
  action: () => Promise<void>
}

export function DangerZoneDeleteCustomer({ businessName, action }: DangerZoneDeleteCustomerProps) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pending, startTransition] = useTransition()

  const matches = confirmText.trim() === businessName.trim()

  const handleConfirm = () => {
    if (!matches) return
    startTransition(async () => {
      await action()
    })
  }

  return (
    <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Delete this customer. This will permanently remove the customer and all their order history.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          setConfirmText('')
          setOpen(true)
        }}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete customer
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setConfirmText('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {businessName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the customer and all their order history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-name" className="text-xs">
              Type the business name to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={businessName}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!matches || pending}
              onClick={(event) => {
                event.preventDefault()
                handleConfirm()
              }}
            >
              {pending ? 'Deleting…' : 'Delete customer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

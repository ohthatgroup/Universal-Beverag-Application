'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface NewCustomerDialogProps {
  action: (formData: FormData) => Promise<void>
  variant?: 'header' | 'fab'
}

export function NewCustomerDialog({ action, variant = 'header' }: NewCustomerDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'fab' ? (
          <button
            type="button"
            aria-label="New customer"
            className="fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg backdrop-blur transition-transform hover:scale-105 md:bottom-8"
          >
            <Plus className="h-6 w-6" />
          </button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>
            A portal access link will be provisioned automatically.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business name</Label>
            <Input id="business-name" name="businessName" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="owner@business.com"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create customer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

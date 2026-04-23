'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AdminFab } from '@/components/admin/admin-fab'
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewCustomerDialog({ action, variant = 'header' }: NewCustomerDialogProps) {
  const [open, setOpen] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isBusinessValid = businessName.trim().length > 0
  const isEmailValid = email.trim() === '' || EMAIL_RE.test(email.trim())
  const canSubmit = isBusinessValid && email.trim().length > 0 && isEmailValid && !submitting

  const reset = () => {
    setBusinessName('')
    setEmail('')
    setEmailError(null)
    setSubmitError(null)
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const handleEmailBlur = () => {
    if (email.trim() === '') {
      setEmailError(null)
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address.')
    } else {
      setEmailError(null)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await action(formData)
      reset()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create customer.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === 'fab' ? (
          <AdminFab
            icon={<Plus className="h-6 w-6" />}
            label="New customer"
            className="sm:hidden"
          />
        ) : (
          <Button
            type="button"
            size="icon"
            aria-label="New customer"
            title="New customer"
            className="hidden sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
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
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business name *</Label>
            <Input
              id="business-name"
              name="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              required
              placeholder="owner@business.com"
              aria-invalid={emailError ? true : undefined}
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>
          {submitError && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <span>{submitError}</span>
              <button
                type="submit"
                className="font-medium underline-offset-4 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Creating…' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

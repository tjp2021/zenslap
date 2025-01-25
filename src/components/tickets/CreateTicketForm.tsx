'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTicketSchema } from '@/lib/validation/tickets'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TICKET_PRIORITIES, TICKET_STATUSES, UserRole } from '@/lib/types'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import Link from 'next/link'
import { useTickets } from '@/lib/context/tickets'

type FormData = z.infer<typeof createTicketSchema>

export function CreateTicketForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { loadTickets } = useTickets()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Get user role from users_secure table
        const { data: userData } = await supabase
          .from('users_secure')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(userData?.role || null)
      }
    }
    getUser()
  }, [supabase])

  const isStaff = userRole === UserRole.ADMIN || userRole === UserRole.AGENT

  const form = useForm<FormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      status: 'open',
      priority: isStaff ? 'medium' : 'high',
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setError('You must be logged in to create a ticket')
      return
    }

    try {
      setError(null)
      setIsSubmitting(true)

      // For regular users, override priority and status
      const ticketData = {
        ...data,
        created_by: user.id,
        status: isStaff ? data.status : 'open',
        priority: isStaff ? data.priority : 'high',
      }

      const { data: ticket, error: createError } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select()
        .single()

      if (createError) throw createError
      if (!ticket) throw new Error('Failed to create ticket')

      // Reload tickets list
      await loadTickets()

      toast.success('Ticket created successfully', {
        description: `Ticket #${ticket.id.slice(0, 8)}`,
        action: {
          label: 'View Ticket',
          onClick: () => router.push(`/tickets/${encodeURIComponent(ticket.id)}`),
        },
        duration: 5000,
      })

      router.push('/tickets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
      toast.error('Failed to create ticket', {
        description: err instanceof Error ? err.message : 'Please try again',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...form.register('title')}
            className="mt-1.5"
            placeholder="Enter ticket title"
            disabled={isSubmitting}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            className="mt-1.5"
            placeholder="Enter ticket description"
            rows={5}
            disabled={isSubmitting}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        {/* Only show priority and status fields for staff */}
        {isStaff && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                defaultValue={form.getValues('priority')}
                onValueChange={(value) => form.setValue('priority', value as FormData['priority'])}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                defaultValue={form.getValues('status')}
                onValueChange={(value) => form.setValue('status', value as FormData['status'])}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Ticket'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
} 
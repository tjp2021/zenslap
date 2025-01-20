"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Ticket, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/types'
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { supabase } from '@/lib/supabase/client'
import { updateTicketSchema } from '@/lib/validation/tickets'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { Clock } from "lucide-react"

interface TicketHistory {
  id: string
  field: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export default function TicketDetails() {
  const router = useRouter()
  const { id } = router.query
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState(false)
  const [history, setHistory] = useState<TicketHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (id) {
      loadTicket()
      loadHistory()

      // Set up real-time subscription
      const subscription = supabase
        .channel('tickets')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'tickets',
          filter: `id=eq.${id}` 
        }, (payload) => {
          setTicket(payload.new as Ticket)
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [id])

  async function loadTicket() {
    try {
      const response = await fetch(`/api/tickets/${id}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setTicket(data.data)
      }
    } catch (err) {
      setError('Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/tickets/${id}/history`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setHistory(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load ticket history')
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setValidationErrors({})

    const formData = new FormData(e.currentTarget)
    const data = {
      id: id as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      status: formData.get('status') as string,
      priority: formData.get('priority') as string,
    }

    try {
      // Validate the data
      const validatedData = updateTicketSchema.parse(data)

      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setTicket(result.data)
        setIsEditing(false)
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err && Array.isArray(err.errors)) {
        const errors: Record<string, string> = {}
        err.errors.forEach((error: { path: string[], message: string }) => {
          const field = error.path[0]
          errors[field] = error.message
        })
        setValidationErrors(errors)
      } else {
        setError('Failed to update ticket')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        router.push('/tickets')
      }
    } catch (err) {
      setError('Failed to delete ticket')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f2] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f7f2] p-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#f5f7f2] p-6">
        <Alert className="max-w-2xl mx-auto">
          <AlertDescription>Ticket not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7f2] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ticket Details</h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push('/tickets')}
            >
              Back
            </Button>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              disabled={saving || deleting}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={deleting || saving}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the ticket.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={ticket.title}
                    required
                    className={validationErrors.title ? 'border-red-500' : ''}
                  />
                  {validationErrors.title && (
                    <p className="text-sm text-red-500">{validationErrors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={ticket.description}
                    required
                    className={validationErrors.description ? 'border-red-500' : ''}
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-red-500">{validationErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-medium">
                      Status
                    </label>
                    <Select name="status" defaultValue={ticket.status}>
                      <SelectTrigger className={validationErrors.status ? 'border-red-500' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.status && (
                      <p className="text-sm text-red-500">{validationErrors.status}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="priority" className="text-sm font-medium">
                      Priority
                    </label>
                    <Select name="priority" defaultValue={ticket.priority}>
                      <SelectTrigger className={validationErrors.priority ? 'border-red-500' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.priority && (
                      <p className="text-sm text-red-500">{validationErrors.priority}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{ticket.title}</h2>
                  <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Status</div>
                    <Badge variant="secondary" className={
                      ticket.status === 'open' ? 'bg-green-50 text-green-700' :
                      ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-700'
                    }>
                      {ticket.status}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Priority</div>
                    <Badge variant="secondary" className={
                      ticket.priority === 'high' ? 'bg-red-50 text-red-700' :
                      ticket.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-700'
                    }>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  <div>Created: {new Date(ticket.created_at).toLocaleString()}</div>
                  <div>Last Updated: {new Date(ticket.updated_at).toLocaleString()}</div>
                </div>
              </div>
            )}

            {!isEditing && (
              <>
                <div className="mt-8 pt-6 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">History</h3>
                  </div>
                  
                  {loadingHistory ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-6" />
                      ))}
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-gray-500">No changes recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((entry) => (
                        <div key={entry.id} className="text-sm">
                          <span className="text-gray-500">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                          <span className="mx-2">•</span>
                          <span>
                            Changed <span className="font-medium">{entry.field}</span> from{' '}
                            <span className="font-medium">{entry.old_value || '(empty)'}</span> to{' '}
                            <span className="font-medium">{entry.new_value || '(empty)'}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
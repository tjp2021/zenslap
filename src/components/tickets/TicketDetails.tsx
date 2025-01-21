'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2, Clock } from "lucide-react"
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

interface TicketHistory {
  id: string
  field: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

interface TicketDetailsProps {
  id: string
}

export function TicketDetails({ id }: TicketDetailsProps) {
  const router = useRouter()
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
  }, [id])

  async function loadTicket() {
    try {
      const { data, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setTicket(data)
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
      const { data, error: fetchError } = await supabase
        .from('ticket_history')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.error(fetchError)
      } else {
        setHistory(data || [])
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
      id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      status: formData.get('status') as string,
      priority: formData.get('priority') as string,
    }

    try {
      const validatedData = updateTicketSchema.parse(data)
      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        setError(updateError.message)
      } else {
        setTicket(updatedTicket)
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
      const { error: deleteError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id)

      if (deleteError) {
        setError(deleteError.message)
      } else {
        router.push('/tickets')
      }
    } catch (err) {
      setError('Failed to delete ticket')
    } finally {
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!ticket) {
    return (
      <Alert>
        <AlertDescription>Ticket not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
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
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-2" />
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
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Input
                  name="title"
                  defaultValue={ticket.title}
                  disabled={!isEditing || saving}
                  className={validationErrors.title ? 'border-red-500' : ''}
                />
                {validationErrors.title && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.title}</p>
                )}
              </div>

              <div>
                <Textarea
                  name="description"
                  defaultValue={ticket.description}
                  disabled={!isEditing || saving}
                  className={validationErrors.description ? 'border-red-500' : ''}
                />
                {validationErrors.description && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    name="status"
                    defaultValue={ticket.status}
                    disabled={!isEditing || saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    name="priority"
                    defaultValue={ticket.priority}
                    disabled={!isEditing || saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map(priority => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* History Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5" />
          <h2 className="text-lg font-semibold">History</h2>
        </div>
        {loadingHistory ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-500">No changes recorded</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="text-sm text-gray-600">
                <span>
                  {entry.field} changed from{' '}
                  <Badge variant="secondary">{entry.old_value || 'none'}</Badge>
                  {' '}to{' '}
                  <Badge variant="secondary">{entry.new_value}</Badge>
                </span>
                <span className="text-gray-400 ml-2">
                  ({new Date(entry.created_at).toLocaleString()})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
} 
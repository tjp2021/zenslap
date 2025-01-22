'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { Ticket } from '@/lib/types'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2, Clock, Tag, User, MessageSquare, CheckCircle2, XCircle } from "lucide-react"
import { updateTicketSchema } from '@/lib/validation/tickets'
import { useAuth } from '@/hooks/useAuth'
import { can, TicketActions } from '@/lib/permissions'
import { useTicket } from '@/hooks/useTicketData'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
import { formatDistanceToNow } from 'date-fns'
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

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
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const { ticket, isLoading, isError, mutate } = useTicket(id)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState(false)
  const [history, setHistory] = useState<TicketHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadHistory = useCallback(async () => {
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
    } catch {
      console.error('Failed to load ticket history')
    } finally {
      setLoadingHistory(false)
    }
  }, [supabase, id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
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
        throw updateError
      } else {
        await mutate(updatedTicket)
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
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)

    try {
      const { error: deleteError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      } else {
        router.push('/tickets')
      }
    } catch (error) {
      console.error('Failed to delete ticket:', error)
    } finally {
      setDeleting(false)
    }
  }

  // Check permissions
  const canEditTicket = useCallback((field?: keyof Ticket) => {
    if (!ticket || !user) return false
    if (field) {
      return can(TicketActions[`EDIT_${field.toUpperCase()}` as keyof typeof TicketActions], user, ticket)
    }
    return can(TicketActions.EDIT, user, ticket)
  }, [user, ticket])

  const canDeleteTicket = useCallback(() => {
    if (!ticket || !user) return false
    return can(TicketActions.DELETE, user, ticket)
  }, [user, ticket])

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-600">
        <p>Failed to load ticket details</p>
      </div>
    )
  }

  if (isLoading || !ticket) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {isEditing ? (
              <Input
                name="title"
                defaultValue={ticket.title}
                disabled={!canEditTicket('title')}
                className="text-xl font-semibold"
                placeholder="Ticket title"
                onChange={(e) => {
                  if (canEditTicket('title')) {
                    setValidationErrors({ ...validationErrors, title: e.target.value })
                  }
                }}
              />
            ) : (
              <h1 className="text-xl font-semibold text-gray-900">{ticket.title}</h1>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{ticket.comment_count || 0} comments</span>
              </div>
            </div>
          </div>
          {canEditTicket() && !isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="text-gray-600 hover:text-gray-900"
            >
              Edit Ticket
            </Button>
          )}
        </div>

        <Separator />

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">Description</h2>
              {isEditing ? (
                <Textarea
                  name="description"
                  defaultValue={ticket.description}
                  disabled={!canEditTicket('description')}
                  className="min-h-[200px]"
                  placeholder="Ticket description"
                  onChange={(e) => {
                    if (canEditTicket('description')) {
                      setValidationErrors({ ...validationErrors, description: e.target.value })
                    }
                  }}
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  {ticket.description || 'No description provided.'}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">Status</h2>
              {isEditing ? (
                <Select
                  name="status"
                  defaultValue={ticket.status}
                  disabled={!canEditTicket('status')}
                  onValueChange={(value) => {
                    if (canEditTicket('status')) {
                      setValidationErrors({ ...validationErrors, status: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">Priority</h2>
              {isEditing ? (
                <Select
                  name="priority"
                  defaultValue={ticket.priority}
                  disabled={!canEditTicket('priority')}
                  onValueChange={(value) => {
                    if (canEditTicket('priority')) {
                      setValidationErrors({ ...validationErrors, priority: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </Badge>
              )}
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">Assignee</h2>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {ticket.assignee || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-gray-700">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map((tag: string) => (
                    <div key={tag} className="flex items-center space-x-1">
                      <Tag className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-600">{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form Actions */}
        {isEditing && (
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            {Object.values(validationErrors).map((error, index) => (
              <div key={index} className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setValidationErrors({})
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="ticket-details-form"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
} 
'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { Ticket, UserRole } from '@/lib/types'
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
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { cn } from '@/lib/utils'
import { CommentHistory } from './CommentHistory'

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
  const { hasRole } = useRoleAccess()
  const isStaff = hasRole([UserRole.ADMIN, UserRole.AGENT] as UserRole[])

  const loadHistory = useCallback(async () => {
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
    }
  }, [supabase, id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

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
    <div className={cn(
      "grid gap-6",
      isStaff ? "grid-cols-3" : "grid-cols-1"
    )}>
      <div className={isStaff ? "col-span-2" : "col-span-1"}>
        <Card className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">{ticket.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Created {formatDistanceToNow(new Date(ticket.created_at))} ago</span>
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
                <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
              )}
            </div>

            {/* Status and Priority */}
            <div className="flex items-center gap-4">
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
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                )}
              </div>

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
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">Assignee</h2>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  {ticket.assignee || 'Unassigned'}
                </span>
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

        {/* Comment History Section */}
        {user && <CommentHistory ticketId={id} userId={user.id} />}
      </div>
    </div>
  )
} 
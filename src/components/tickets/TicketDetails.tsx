'use client'

import { useState, useCallback, useEffect, useReducer, useMemo } from 'react'
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
import { Ticket, UserRole, TICKET_STATUSES, TICKET_PRIORITIES, UpdateTicketDTO } from '@/lib/types'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2, Clock, Tag, User, MessageSquare, CheckCircle2, XCircle } from "lucide-react"
import { updateTicketSchema } from '@/lib/validation/tickets'
import { useAuth } from '@/hooks/useAuth'
import { can, TicketActions } from '@/lib/permissions'
import { useTicket, useUsers } from '@/hooks/useTicketData'
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
import { useStaffUsers } from '@/hooks/useStaffUsers'

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

// Form state type
interface FormState {
  status: 'idle' | 'editing' | 'submitting' | 'error'
  validationErrors: Record<string, string>
  dirtyFields: Set<keyof UpdateTicketDTO>
}

// Form state reducer
type FormAction = 
  | { type: 'START_EDITING' }
  | { type: 'CANCEL_EDITING' }
  | { type: 'START_SUBMITTING' }
  | { type: 'SET_VALIDATION_ERRORS', errors: Record<string, string> }
  | { type: 'MARK_FIELD_DIRTY', field: keyof UpdateTicketDTO }
  | { type: 'RESET' }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'START_EDITING':
      return {
        ...state,
        status: 'editing',
        validationErrors: {},
        dirtyFields: new Set<keyof UpdateTicketDTO>()
      }
    case 'CANCEL_EDITING':
    case 'RESET':
      return {
        status: 'idle',
        validationErrors: {},
        dirtyFields: new Set<keyof UpdateTicketDTO>()
      }
    case 'START_SUBMITTING':
      return {
        ...state,
        status: 'submitting'
      }
    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        status: 'error',
        validationErrors: action.errors
      }
    case 'MARK_FIELD_DIRTY':
      const newDirtyFields = new Set(state.dirtyFields)
      newDirtyFields.add(action.field)
      return {
        ...state,
        dirtyFields: newDirtyFields
      }
    default:
      return state
  }
}

export function TicketDetails({ id }: TicketDetailsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const { ticket, isLoading, isError, mutate } = useTicket(id)
  const { users: staffUsers, isLoading: staffLoading, error: staffError } = useStaffUsers()
  const [deleting, setDeleting] = useState(false)
  const [history, setHistory] = useState<TicketHistory[]>([])
  const { hasRole } = useRoleAccess()
  const isStaff = hasRole([UserRole.ADMIN, UserRole.AGENT] as UserRole[])

  // Use reducer instead of useState
  const [formState, dispatch] = useReducer(formReducer, {
    status: 'idle',
    validationErrors: {},
    dirtyFields: new Set<keyof UpdateTicketDTO>()
  })

  const isEditing = formState.status === 'editing'
  const isSubmitting = formState.status === 'submitting'
  const hasErrors = Object.keys(formState.validationErrors).length > 0

  // Debug render cycle
  useEffect(() => {
    console.log('🔍 Component rendered with formState:', {
      status: formState.status,
      isEditing,
      ticket: ticket?.id
    })
  }, [formState, isEditing, ticket?.id])

  // Debug staff users
  useEffect(() => {
    console.log('🔥 TICKET DETAILS: Staff users state:', {
      users: staffUsers,
      loading: staffLoading,
      error: staffError
    })
  }, [staffUsers, staffLoading, staffError])

  // Debug staff users on every render
  useEffect(() => {
    console.log('🔥 TICKET DETAILS: Staff users updated:', {
      count: staffUsers?.length || 0,
      loading: staffLoading,
      error: staffError,
      users: staffUsers
    })
  }, [staffUsers, staffLoading, staffError])

  // Memoized state transitions
  const startEditing = useCallback(() => {
    console.log('🔍 startEditing called')
    dispatch({ type: 'START_EDITING' })
  }, [])

  const cancelEditing = useCallback(() => {
    console.log('🔍 cancelEditing called')
    dispatch({ type: 'CANCEL_EDITING' })
  }, [])

  // Track form state changes
  useEffect(() => {
    if (isEditing) {
      console.log('🔍 Form entered edit mode')
      return () => console.log('🔍 Form leaving edit mode')
    }
  }, [isEditing])

  const handleFieldChange = useCallback((field: keyof UpdateTicketDTO) => {
    dispatch({ type: 'MARK_FIELD_DIRTY', field })
  }, [])

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

  const canEditTicket = useCallback((field?: keyof Ticket) => {
    if (!ticket || !user) return false
    
    // For general edit permission
    if (!field) {
      return can(TicketActions.EDIT, user, ticket)
    }
    // For specific field permission
    const action = TicketActions[`EDIT_${field.toUpperCase()}` as keyof typeof TicketActions]
    return can(action, user, ticket)
  }, [user, ticket])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log('🔍 Form Submit - Starting submission')
    
    if (!ticket || formState.status === 'submitting' || !isEditing) {
      console.log('🔍 Form Submit - Early return:', { ticket: !!ticket, status: formState.status, isEditing })
      return
    }

    // Don't submit if no fields were changed
    if (formState.dirtyFields.size === 0) {
      console.log('🔍 Form Submit - No fields changed')
      dispatch({ type: 'CANCEL_EDITING' })
      return
    }

    dispatch({ type: 'START_SUBMITTING' })

    const formData = new FormData(e.currentTarget)
    const updates: Partial<UpdateTicketDTO> = { id }

    // Collect all potentially changed fields
    if (formState.dirtyFields.has('title')) {
      const titleValue = formData.get('title')
      if (titleValue && typeof titleValue === 'string') {
        updates.title = titleValue
      }
    }

    if (formState.dirtyFields.has('description')) {
      const descriptionValue = formData.get('description')
      if (descriptionValue && typeof descriptionValue === 'string') {
        updates.description = descriptionValue
      }
    }

    if (formState.dirtyFields.has('status')) {
      const statusValue = formData.get('status')?.toString()
      if (statusValue && TICKET_STATUSES.includes(statusValue as any)) {
        updates.status = statusValue as typeof TICKET_STATUSES[number]
      }
    }

    if (formState.dirtyFields.has('priority')) {
      const priorityValue = formData.get('priority')?.toString()
      if (priorityValue && TICKET_PRIORITIES.includes(priorityValue as any)) {
        updates.priority = priorityValue as typeof TICKET_PRIORITIES[number]
      }
    }

    if (formState.dirtyFields.has('assignee')) {
      const assigneeValue = formData.get('assignee')?.toString()
      updates.assignee = assigneeValue === 'unassigned' ? null : assigneeValue
    }

    console.log('🔍 Form Submit - Collected updates:', updates)
    console.log('🔍 Form Submit - Dirty fields:', Array.from(formState.dirtyFields))

    try {
      const validatedData = updateTicketSchema.parse(updates)
      console.log('🔍 Form Submit - Sending to Supabase:', validatedData)
      
      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single()

      console.log('🔍 Form Submit - Supabase response:', { updatedTicket, error: updateError })

      if (updateError) throw updateError

      if (updatedTicket) {
        console.log('🔍 Form Submit - Success:', updatedTicket)
        await mutate(updatedTicket as Ticket)
        dispatch({ type: 'RESET' })
      }
    } catch (err: unknown) {
      console.error('🔍 Form Submit - Error:', err)
      if (err && typeof err === 'object' && 'errors' in err && Array.isArray(err.errors)) {
        const errors: Record<string, string> = {}
        err.errors.forEach((error: { path: string[], message: string }) => {
          const field = error.path.join('.')
          errors[field] = error.message
        })
        dispatch({ type: 'SET_VALIDATION_ERRORS', errors })
      } else {
        console.error('Error updating ticket:', err)
        dispatch({ type: 'SET_VALIDATION_ERRORS', errors: { form: 'Failed to update ticket' } })
      }
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

  // Memoize the comment history component
  const memoizedCommentHistory = useMemo(() => {
    return user ? <CommentHistory ticketId={id} userId={user.id} /> : null
  }, [id, user])

  // Wrap the form in a memo to prevent unnecessary re-renders
  const EditForm = useMemo(() => {
    console.log('🔍 Rendering form with editing:', isEditing)
    if (!ticket) return null

    return (
      <form 
        key={isEditing ? 'editing' : 'viewing'} 
        onSubmit={handleSubmit} 
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {isEditing ? (
              <Input
                name="title"
                defaultValue={ticket.title}
                className="text-2xl font-semibold"
                disabled={!canEditTicket('title')}
                onChange={() => handleFieldChange('title')}
              />
            ) : (
              <h1 className="text-2xl font-semibold">{ticket.title}</h1>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Created {formatDistanceToNow(new Date(ticket.created_at))} ago</span>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing && canEditTicket() && (
              <Button
                onClick={startEditing}
                variant="outline"
                className="text-gray-600 hover:text-gray-900"
              >
                Edit Ticket
              </Button>
            )}
            {isEditing && (
              <Button
                onClick={cancelEditing}
                variant="outline"
                className="text-gray-600 hover:text-gray-900"
              >
                Done Editing
              </Button>
            )}
          </div>
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-700">Status</h2>
            {isEditing ? (
              <Select
                name="status"
                defaultValue={ticket.status || "open"}
                disabled={!canEditTicket('status')}
                onValueChange={(value) => {
                  console.log('🔍 Status changed:', value)
                  handleFieldChange('status')
                  // Make immediate update but stay in edit mode
                  const updates: Partial<UpdateTicketDTO> = { 
                    id,
                    status: value as typeof TICKET_STATUSES[number]
                  }
                  console.log('🔍 Sending status update:', updates)
                  supabase
                    .from('tickets')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single()
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('Failed to update status:', error)
                        return
                      }
                      console.log('Status updated:', data)
                      mutate(data as Ticket)
                    })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn("capitalize", getStatusColor(ticket.status))}>
                {ticket.status.replace('_', ' ').toLowerCase()}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium text-gray-700">Priority</h2>
            {isEditing ? (
              <Select
                name="priority"
                defaultValue={ticket.priority || "medium"}
                disabled={!canEditTicket('priority')}
                onValueChange={(value) => {
                  console.log('🔍 Priority changed:', value)
                  handleFieldChange('priority')
                  // Make immediate update but stay in edit mode
                  const updates: Partial<UpdateTicketDTO> = { 
                    id,
                    priority: value as typeof TICKET_PRIORITIES[number]
                  }
                  console.log('🔍 Sending priority update:', updates)
                  supabase
                    .from('tickets')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single()
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('Failed to update priority:', error)
                        return
                      }
                      console.log('Priority updated:', data)
                      mutate(data as Ticket)
                    })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn("capitalize", getPriorityColor(ticket.priority))}>
                {ticket.priority.toLowerCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Assignee */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Assignee</h2>
          {isEditing ? (
            <Select
              name="assignee"
              defaultValue={ticket.assignee || "unassigned"}
              disabled={!canEditTicket('assignee') || staffLoading}
              onValueChange={(value) => {
                console.log('🔍 Assignee changed:', value)
                handleFieldChange('assignee')
                // Make immediate update but stay in edit mode
                const updates: Partial<UpdateTicketDTO> = { 
                  id,
                  assignee: value === 'unassigned' ? null : value
                }
                console.log('🔍 Sending assignee update:', updates)
                supabase
                  .from('tickets')
                  .update(updates)
                  .eq('id', id)
                  .select()
                  .single()
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('Failed to update assignee:', error)
                      return
                    }
                    console.log('Assignee updated:', data)
                    mutate(data as Ticket)
                  })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={staffLoading ? "Loading..." : "Select assignee"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffError ? (
                  <SelectItem value="error-loading" disabled>Error loading users</SelectItem>
                ) : staffLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : staffUsers?.length === 0 ? (
                  <SelectItem value="no-users" disabled>No staff users found</SelectItem>
                ) : (
                  staffUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.role.toLowerCase()})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="h-4 w-4" />
              <span>
                {staffLoading ? (
                  "Loading..."
                ) : ticket.assignee ? (
                  staffUsers?.find(u => u.id === ticket.assignee)?.email || 'Unknown User'
                ) : (
                  'Unassigned'
                )}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-700">Description</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Error Display */}
        {hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the following errors:
              <ul className="mt-2 list-disc list-inside">
                {Object.entries(formState.validationErrors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </form>
    )
  }, [
    isEditing,
    ticket,
    staffUsers,
    canEditTicket,
    handleFieldChange,
    hasErrors,
    formState.validationErrors,
    isSubmitting,
    startEditing,
    cancelEditing
  ])

  return (
    <div className={cn(
      "grid gap-6",
      isStaff ? "grid-cols-3" : "grid-cols-1"
    )}>
      <div className={isStaff ? "col-span-2" : "col-span-1"}>
        <Card className="p-6">
          {EditForm}
        </Card>

        {/* Comment History Section */}
        {memoizedCommentHistory}
      </div>
    </div>
  )
} 
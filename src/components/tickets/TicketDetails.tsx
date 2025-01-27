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
import { Ticket, UserRole, TICKET_STATUSES, TICKET_PRIORITIES, UpdateTicketDTO, User } from '@/lib/types'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2, Clock, Tag, User as LucideUser, MessageSquare, CheckCircle2, XCircle } from "lucide-react"
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
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { StaffUser } from '@/hooks/useStaffUsers'
import { QueryClient } from '@tanstack/react-query'
import { KeyedMutator } from 'swr'
import { SLACalculator } from '@/lib/services/SLACalculator'

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

interface TicketFormProps {
  isEditing: boolean;
  ticket: Ticket | null;
  staffUsers: StaffUser[] | undefined;
  canEditTicket: (field?: keyof Ticket) => boolean;
  handleFieldChange: (field: keyof UpdateTicketDTO) => void;
  hasErrors: boolean;
  formState: FormState;
  isSubmitting: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  queryClient: QueryClient;
  mutate: KeyedMutator<Ticket>;
}

const SLADeadline = React.memo(function SLADeadline({ ticket }: { ticket: Ticket }) {
  const slaCalculator = new SLACalculator()
  const deadline = slaCalculator.getSLADeadline(ticket)
  const isOverdue = new Date() > deadline
  const timeLeft = formatDistanceToNow(deadline, { addSuffix: true })

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-700">Response Time SLA</h2>
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        isOverdue ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
      )}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className={cn(
              "h-5 w-5",
              isOverdue ? "text-red-500" : "text-green-500"
            )} />
            <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-sm">
              {isOverdue ? "OVERDUE" : "ON TRACK"}
            </Badge>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isOverdue ? "Overdue by" : "Due"} {timeLeft}
            </span>
            <span className="text-xs text-gray-500">
              {ticket.priority} priority response time
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

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
  const queryClient = useQueryClient()

  // Use reducer instead of useState
  const [formState, dispatch] = useReducer(formReducer, {
    status: 'idle',
    validationErrors: {},
    dirtyFields: new Set<keyof UpdateTicketDTO>()
  })

  const isEditing = formState.status === 'editing'
  const isSubmitting = formState.status === 'submitting'
  const hasErrors = Object.keys(formState.validationErrors).length > 0

  // Consolidate all debug logging into a single effect
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 TicketDetails Debug:', {
        formState: {
          status: formState.status,
          isEditing,
          ticketId: ticket?.id
        },
        staffState: {
          count: staffUsers?.length || 0,
          loading: staffLoading,
          error: staffError
        }
      })
    }
  }, [formState.status, isEditing, ticket?.id, staffUsers, staffLoading, staffError])

  // Remove individual debug effects
  const startEditing = useCallback(() => {
    dispatch({ type: 'START_EDITING' })
  }, [])

  const cancelEditing = useCallback(() => {
    dispatch({ type: 'CANCEL_EDITING' })
  }, [])

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
    
    if (!ticket || formState.status === 'submitting' || !isEditing) {
      return
    }

    // Don't submit if no fields were changed
    if (formState.dirtyFields.size === 0) {
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

    try {
      const validatedData = updateTicketSchema.parse(updates)
      
      const { data: updatedTicket, error: updateError } = await supabase
        .rpc('update_ticket_with_activity', {
          p_ticket_id: id,
          p_updates: validatedData,
          p_actor_id: user?.id
        })

      if (updateError) throw updateError

      if (updatedTicket) {
        await mutate(updatedTicket as Ticket)
        queryClient.invalidateQueries({ queryKey: ['ticket-activities', id] })
        dispatch({ type: 'RESET' })
      }
    } catch (err: unknown) {
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

  // Memoize staff state once
  const memoizedStaffState = useMemo(() => ({
    users: staffUsers,
    loading: staffLoading,
    error: staffError
  }), [staffUsers, staffLoading, staffError])

  // Memoize comment history with proper deps
  const memoizedCommentHistory = useMemo(() => {
    if (!user) return null
    return (
      <div className="mt-6">
        <Card className="p-6">
          <CommentHistory ticketId={id} userId={user.id} />
        </Card>
      </div>
    )
  }, [id, user])

  // Memoize the form component
  const TicketForm = React.memo(function TicketForm(props: TicketFormProps) {
    if (!props.ticket) return null

    // Safely access ticket properties
    const ticket = props.ticket
    
    return (
      <form 
        key={props.isEditing ? 'editing' : 'viewing'} 
        onSubmit={props.handleSubmit} 
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {props.isEditing ? (
              <Input
                name="title"
                defaultValue={ticket.title}
                className="text-2xl font-semibold"
                disabled={!props.canEditTicket('title')}
                onChange={() => props.handleFieldChange('title')}
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
            {!props.isEditing && isStaff && (
              <Button
                onClick={props.startEditing}
                variant="outline"
                className="text-gray-600 hover:text-gray-900"
              >
                Edit Ticket
              </Button>
            )}
            {props.isEditing && (
              <Button
                onClick={props.cancelEditing}
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
            {props.isEditing ? (
              <Select
                name="status"
                defaultValue={ticket.status || "open"}
                disabled={!props.canEditTicket('status')}
                onValueChange={(value) => {
                  props.handleFieldChange('status')
                  // Make immediate update using RPC function
                  const updates: Partial<UpdateTicketDTO> = { 
                    id,
                    status: value as typeof TICKET_STATUSES[number]
                  }
                  supabase
                    .rpc('update_ticket_with_activity', {
                      p_ticket_id: id,
                      p_updates: updates,
                      p_actor_id: user?.id
                    })
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('Failed to update status:', error)
                        return
                      }
                      props.handleSubmit(data as React.FormEvent<HTMLFormElement>)
                      // Invalidate activities query to trigger refresh
                      props.queryClient.invalidateQueries({ queryKey: ['ticket-activities', id] })
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
            {props.isEditing ? (
              <Select
                name="priority"
                defaultValue={ticket.priority || "medium"}
                disabled={!props.canEditTicket('priority')}
                onValueChange={(value) => {
                  props.handleFieldChange('priority')
                  // Make immediate update using RPC function
                  const updates: Partial<UpdateTicketDTO> = { 
                    id,
                    priority: value as typeof TICKET_PRIORITIES[number]
                  }
                  supabase
                    .rpc('update_ticket_with_activity', {
                      p_ticket_id: id,
                      p_updates: updates,
                      p_actor_id: user?.id
                    })
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('Failed to update priority:', error)
                        return
                      }
                      props.handleSubmit(data as React.FormEvent<HTMLFormElement>)
                      // Invalidate activities query to trigger refresh
                      props.queryClient.invalidateQueries({ queryKey: ['ticket-activities', id] })
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
          {props.isEditing ? (
            <Select
              name="assignee"
              defaultValue={ticket.assignee || "unassigned"}
              disabled={!props.canEditTicket('assignee') || memoizedStaffState.loading}
              onValueChange={(value) => {
                props.handleFieldChange('assignee')
                // Make immediate update using RPC function
                const updates: Partial<UpdateTicketDTO> = { 
                  id,
                  assignee: value === 'unassigned' ? null : value
                }
                supabase
                  .rpc('update_ticket_with_activity', {
                    p_ticket_id: id,
                    p_updates: updates,
                    p_actor_id: user?.id
                  })
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('Failed to update assignee:', error)
                      return
                    }
                    props.handleSubmit(data as React.FormEvent<HTMLFormElement>)
                    // Invalidate activities query to trigger refresh
                    props.queryClient.invalidateQueries({ queryKey: ['ticket-activities', id] })
                  })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={memoizedStaffState.loading ? "Loading..." : "Select assignee"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {memoizedStaffState.error ? (
                  <SelectItem value="error-loading" disabled>Error loading users</SelectItem>
                ) : memoizedStaffState.loading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : memoizedStaffState.users?.length === 0 ? (
                  <SelectItem value="no-users" disabled>No staff users found</SelectItem>
                ) : (
                  memoizedStaffState.users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.role.toLowerCase()})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <LucideUser className="h-4 w-4" />
              <span>
                {memoizedStaffState.loading ? (
                  "Loading..."
                ) : ticket.assignee ? (
                  memoizedStaffState.users?.find(u => u.id === ticket.assignee)?.email || 'Unknown User'
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
        {props.hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the following errors:
              <ul className="mt-2 list-disc list-inside">
                {Object.entries(props.formState.validationErrors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Remove redundant badges and add SLA at bottom */}
        <div className="mt-6 pt-6 border-t">
          <SLADeadline ticket={ticket} />
        </div>
      </form>
    )
  }, (prevProps, nextProps) => {
    // Only re-render if these actually changed
    return (
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.ticket === nextProps.ticket &&
      prevProps.handleSubmit === nextProps.handleSubmit
    )
  })

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
    <div className="grid gap-6">
      <div className="col-span-1">
        <Card className="p-6">
          <TicketForm
            isEditing={isEditing}
            ticket={ticket}
            staffUsers={staffUsers}
            canEditTicket={canEditTicket}
            handleFieldChange={handleFieldChange}
            hasErrors={hasErrors}
            formState={formState}
            isSubmitting={isSubmitting}
            startEditing={startEditing}
            cancelEditing={cancelEditing}
            handleSubmit={handleSubmit}
            queryClient={queryClient}
            mutate={mutate}
          />
        </Card>

        {/* Comment History Section */}
        {memoizedCommentHistory}
      </div>
    </div>
  )
} 
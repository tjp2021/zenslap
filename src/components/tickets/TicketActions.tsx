'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, UserPlus } from "lucide-react"
import { AgentAndAbove } from '@/components/auth/PermissionGate'
import { can, TicketActions as TicketActionTypes } from '@/lib/permissions'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Ticket, User } from '@/lib/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUsers } from '@/hooks/useTicketData'

interface TicketActionsProps {
  ticket: Ticket
  onEdit?: () => void
  onDelete?: () => void
  onAssign?: (userId: string | null) => void
  isDeleting?: boolean
  isAssigning?: boolean
}

export function TicketActions({ 
  ticket, 
  onEdit, 
  onDelete,
  onAssign,
  isDeleting = false,
  isAssigning = false
}: TicketActionsProps) {
  const router = useRouter()
  const { user } = useAuth() as { user: User | null }
  const { users } = useUsers()

  // Check permissions
  const canEdit = can(TicketActionTypes.EDIT, user, ticket)
  const canDelete = can(TicketActionTypes.DELETE, user, ticket)
  const canAssign = can(TicketActionTypes.EDIT_ASSIGNEE, user, ticket)

  return (
    <div className="flex items-center gap-2">
      <AgentAndAbove>
        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="hover:bg-primary/20"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit ticket</span>
          </Button>
        )}

        {canAssign && onAssign && (
          <Select
            onValueChange={(value) => onAssign(value === 'unassign' ? null : value)}
            disabled={isAssigning}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <SelectValue placeholder={isAssigning ? "Assigning..." : "Assign to..."} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {users.map((user: User) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.email}
                </SelectItem>
              ))}
              <SelectItem value="unassign" className="border-t mt-2">
                Unassign
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {canDelete && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-destructive/20"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete ticket</span>
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
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </AgentAndAbove>
    </div>
  )
} 
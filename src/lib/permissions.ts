import type { User, Ticket } from './types'
import { UserRole } from './types'

// Define all possible actions as constants
export const TicketActions = {
  DELETE: 'ticket:delete',
  EDIT: 'ticket:edit',
  EDIT_STATUS: 'ticket:edit:status',
  EDIT_PRIORITY: 'ticket:edit:priority',
  EDIT_ASSIGNEE: 'ticket:edit:assignee',
  EDIT_TITLE: 'ticket:edit:title',
  EDIT_DESCRIPTION: 'ticket:edit:description',
  ADD_COMMENT: 'ticket:comment:add',
  DELETE_COMMENT: 'ticket:comment:delete',
  ADD_ATTACHMENT: 'ticket:attachment:add',
  VIEW_INTERNAL_NOTES: 'ticket:notes:view',
  ADD_INTERNAL_NOTE: 'ticket:notes:add',
} as const

export type TicketAction = typeof TicketActions[keyof typeof TicketActions]

// Define conditions that can be reused across permission checks
const conditions = {
  isAdmin: (user: User | null) => user?.role.toUpperCase() === UserRole.ADMIN,
  isAgent: (user: User | null) => user?.role.toUpperCase() === UserRole.AGENT,
  isTicketCreator: (user: User | null, ticket: Ticket) => user?.id === ticket.created_by,
  isAssignedAgent: (user: User | null, ticket: Ticket) => user?.id === ticket.assignee,
  isTicketOpen: (_user: User | null, ticket: Ticket) => ticket.status !== 'closed',
  isAuthenticated: (user: User | null) => user !== null,
}

// Define permission rules for each action
const permissionRules: Record<TicketAction, (user: User | null, ticket: Ticket) => boolean> = {
  [TicketActions.DELETE]: (user) => conditions.isAdmin(user),
  
  [TicketActions.EDIT]: (user) => 
    conditions.isAuthenticated(user) &&
    (conditions.isAdmin(user) || conditions.isAgent(user)),
  
  [TicketActions.EDIT_STATUS]: (user) =>
    conditions.isAdmin(user) || conditions.isAgent(user),
  
  [TicketActions.EDIT_PRIORITY]: (user, ticket) =>
    conditions.isTicketOpen(user, ticket) &&
    (conditions.isAdmin(user) || conditions.isAgent(user)),
  
  [TicketActions.EDIT_ASSIGNEE]: (user, ticket) =>
    conditions.isTicketOpen(user, ticket) &&
    (conditions.isAdmin(user) || conditions.isAgent(user)),
  
  [TicketActions.EDIT_TITLE]: (user, ticket) =>
    conditions.isTicketOpen(user, ticket) && conditions.isAdmin(user),
  
  [TicketActions.EDIT_DESCRIPTION]: (user, ticket) =>
    conditions.isTicketOpen(user, ticket) && conditions.isAdmin(user),
  
  [TicketActions.ADD_COMMENT]: (user, ticket) =>
    conditions.isAuthenticated(user) &&
    conditions.isTicketOpen(user, ticket) &&
    (conditions.isAdmin(user) || 
     conditions.isAgent(user) || 
     conditions.isTicketCreator(user, ticket)),
  
  [TicketActions.DELETE_COMMENT]: (user, ticket) => {
    // Allow admins to delete any comment
    if (conditions.isAdmin(user)) return true
    
    // Allow users to delete their own comments
    const comment = ticket as any // ticket here is actually a comment
    return user?.id === comment.actor_id
  },
  
  [TicketActions.ADD_ATTACHMENT]: (user, ticket) =>
    conditions.isAuthenticated(user) &&
    conditions.isTicketOpen(user, ticket) &&
    (conditions.isAdmin(user) || 
     conditions.isAgent(user) || 
     conditions.isTicketCreator(user, ticket)),
  
  [TicketActions.VIEW_INTERNAL_NOTES]: (user) =>
    conditions.isAdmin(user) || conditions.isAgent(user),
  
  [TicketActions.ADD_INTERNAL_NOTE]: (user, ticket) =>
    conditions.isTicketOpen(user, ticket) &&
    (conditions.isAdmin(user) || conditions.isAgent(user)),
}

// Main permission check function
export function can(action: TicketAction, user: User | null, ticket: Ticket): boolean {
  const rule = permissionRules[action]
  if (!rule) return false
  return rule(user, ticket)
}

// Helper functions for common checks (for convenience)
export const ticketPermissions = {
  canDelete: (user: User | null, ticket: Ticket) => can(TicketActions.DELETE, user, ticket),
  canEdit: (user: User | null, ticket: Ticket) => can(TicketActions.EDIT, user, ticket),
  canAddComment: (user: User | null, ticket: Ticket) => can(TicketActions.ADD_COMMENT, user, ticket),
  canEditField: (user: User | null, ticket: Ticket, field: keyof Ticket) => {
    const actionMap: Partial<Record<keyof Ticket, TicketAction>> = {
      status: TicketActions.EDIT_STATUS,
      priority: TicketActions.EDIT_PRIORITY,
      assignee: TicketActions.EDIT_ASSIGNEE,
      title: TicketActions.EDIT_TITLE,
      description: TicketActions.EDIT_DESCRIPTION,
    }
    const action = actionMap[field]
    if (!action) return false
    return can(action, user, ticket)
  }
} 
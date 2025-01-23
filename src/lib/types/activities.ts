// Activity type constants
export const ACTIVITY_TYPES = {
  COMMENT: 'comment',
  STATUS_CHANGE: 'status_change',
  FIELD_CHANGE: 'field_change',
  ASSIGNMENT: 'assignment'
} as const

// Activity type from constants
export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES]

// Content types for each activity
export interface CommentContent {
  text: string
  is_internal: boolean
}

export interface StatusChangeContent {
  from: string
  to: string
}

export interface FieldChangeContent {
  field: string
  from: string | number | boolean | null
  to: string | number | boolean | null
}

export interface AssignmentContent {
  from: string | null
  to: string | null
}

// Actor type
export interface Actor {
  id: string
  email: string
  role: string
}

// Main ticket activity interface
export interface TicketActivity {
  id: string
  ticket_id: string
  actor_id: string
  actor: Actor
  activity_type: ActivityType
  content: CommentContent | StatusChangeContent | FieldChangeContent | AssignmentContent
  created_at: string
  is_internal: boolean
}

// DTO for creating a new activity
export interface CreateActivityDTO {
  ticket_id: string
  actor_id: string
  activity_type: ActivityType
  content: CommentContent | StatusChangeContent | FieldChangeContent | AssignmentContent
} 
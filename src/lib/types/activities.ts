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

// Union type for all activity content
export type ActivityContent = 
  | { type: typeof ACTIVITY_TYPES.COMMENT; content: CommentContent }
  | { type: typeof ACTIVITY_TYPES.STATUS_CHANGE; content: StatusChangeContent }
  | { type: typeof ACTIVITY_TYPES.FIELD_CHANGE; content: FieldChangeContent }
  | { type: typeof ACTIVITY_TYPES.ASSIGNMENT; content: AssignmentContent }

// Main ticket activity interface
export interface TicketActivity {
  id: string
  ticket_id: string
  actor_id: string
  activity_type: ActivityType
  content: ActivityContent['content']
  created_at: string
} 
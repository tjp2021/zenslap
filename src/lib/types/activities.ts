// Activity type constants
export const ACTIVITY_TYPES = {
  COMMENT: 'comment',
  STATUS_CHANGE: 'status_change',
  FIELD_CHANGE: 'field_change',
  ASSIGNMENT: 'assignment',
  TAG_CHANGE: 'tag_change'
} as const

// Activity type from constants
export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES]

// Mention data type
export interface MentionData {
  id: string
  type: 'user'
  referenced_id: string
}

// Content types for each activity
export interface CommentContent {
  text: string
  is_internal: boolean
  raw_content?: string // Original input with @mentions
  parsed_content?: string // Processed content with mention metadata
  mentions?: MentionData[] // Array of mentions in the comment
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

export interface TagChangeContent {
  action: 'add' | 'remove'
  tag: string
}

// Union type for all activity content types
export type ActivityContent = {
  comment: CommentContent
  status_change: StatusChangeContent
  field_change: FieldChangeContent
  assignment: AssignmentContent
  tag_change: TagChangeContent
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
  content: CommentContent | StatusChangeContent | FieldChangeContent | AssignmentContent | TagChangeContent
  created_at: string
  is_internal: boolean
}

// DTO for creating a new activity
export interface CreateActivityDTO {
  ticket_id: string
  actor_id: string
  activity_type: ActivityType
  content: CommentContent | StatusChangeContent | FieldChangeContent | AssignmentContent | TagChangeContent
} 
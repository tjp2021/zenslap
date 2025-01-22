export const ACTIVITY_TYPES = {
  COMMENT: 'comment',
  STATUS_CHANGE: 'status_change',
  FIELD_CHANGE: 'field_change',
  ASSIGNMENT: 'assignment'
} as const

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES]

export interface ActivityContent {
  comment: {
    message: string
    format: 'text'
  }
  status_change: {
    from: string
    to: string
  }
  field_change: {
    field: string
    from: string
    to: string
  }
  assignment: {
    from: string | null
    to: string | null
  }
}

export interface TicketActivity {
  id: string
  ticket_id: string
  actor_id: string | null
  activity_type: ActivityType
  content: ActivityContent[keyof ActivityContent]
  created_at: string
} 
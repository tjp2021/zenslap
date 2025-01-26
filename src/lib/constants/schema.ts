export const SCHEMA = {
  RELATIONSHIPS: {
    TICKET_ACTIVITIES: {
      TICKET: {
        path: 'tickets',
        fields: {
          id: 'id',
          title: 'title',
          description: 'description',
          status: 'status',
          priority: 'priority',
          created_by: 'created_by',
          assignee: 'assignee'
        }
      },
      ACTOR: {
        path: 'users_secure',
        fields: {
          id: 'id',
          email: 'email',
          role: 'role'
        }
      }
    }
  }
} as const 
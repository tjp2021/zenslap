const SCHEMA = {
  tables: {
    tickets: {
      name: 'tickets',
      constraints: {
        primaryKey: 'tickets_pkey',
        foreignKeys: {
          created_by: 'tickets_created_by_fkey',
          assignee: 'tickets_assignee_fkey'
        }
      },
      columns: {
        id: 'id',
        title: 'title',
        description: 'description',
        status: 'status',
        priority: 'priority',
        created_by: 'created_by',
        assignee: 'assignee',
        created_at: 'created_at',
        updated_at: 'updated_at'
      }
    },
    ticket_activities: {
      name: 'ticket_activities',
      constraints: {
        primaryKey: 'ticket_activities_pkey',
        foreignKeys: {
          ticket_id: 'ticket_activities_ticket_id_fkey',
          actor_id: 'ticket_activities_actor_id_fkey'
        }
      },
      columns: {
        id: 'id',
        ticket_id: 'ticket_id',
        actor_id: 'actor_id',
        activity_type: 'activity_type',
        content: 'content',
        created_at: 'created_at'
      }
    }
  }
} as const

module.exports = {
  SCHEMA
} 
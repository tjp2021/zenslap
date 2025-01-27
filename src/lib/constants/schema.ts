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
    },
    SLA_POLICIES: {
      CREATED_BY: {
        path: 'users_secure',
        fields: {
          id: 'id',
          email: 'email',
          role: 'role'
        }
      }
    },
    TICKETS: {
      SLA_POLICY: {
        path: 'sla_policies',
        fields: {
          id: 'id',
          priority: 'priority',
          response_time_hours: 'response_time_hours',
          resolution_time_hours: 'resolution_time_hours',
          is_active: 'is_active'
        }
      }
    }
  },
  TABLES: {
    SLA_POLICIES: {
      name: 'sla_policies',
      fields: {
        id: 'uuid',
        priority: 'sla_priority',
        response_time_hours: 'integer',
        resolution_time_hours: 'integer',
        is_active: 'boolean',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
        created_by: 'uuid'
      }
    },
    SLA_MONITORING: {
      name: 'sla_monitoring',
      fields: {
        id: 'uuid',
        title: 'text',
        status: 'ticket_status',
        priority: 'sla_priority',
        created_at: 'timestamptz',
        sla_response_deadline: 'timestamptz',
        sla_resolution_deadline: 'timestamptz',
        first_response_at: 'timestamptz',
        resolution_at: 'timestamptz',
        sla_response_status: 'sla_status',
        sla_resolution_status: 'sla_status',
        is_breaching_sla: 'boolean'
      }
    }
  }
} as const 
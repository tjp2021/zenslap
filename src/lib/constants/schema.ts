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
    NOTIFICATIONS: {
      AI_ANALYSIS: {
        path: 'ai_analyses',
        fields: {
          id: 'id',
          type: 'type',
          result: 'result',
          confidence: 'confidence',
          model_info: 'model_info'
        }
      },
      ACTIVITY: {
        path: 'ticket_activities',
        fields: {
          id: 'id',
          ticket_id: 'ticket_id',
          activity_type: 'activity_type',
          content: 'content'
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
    },
    AI_ANALYSES: {
      TICKET: {
        path: 'tickets',
        fields: {
          id: 'id',
          title: 'title',
          description: 'description',
          status: 'status',
          priority: 'priority'
        }
      },
      VALIDATOR: {
        path: 'users_secure',
        fields: {
          id: 'id',
          email: 'email',
          role: 'role'
        }
      }
    }
  },
  TABLES: {
    NOTIFICATIONS: {
      name: 'notifications',
      fields: {
        id: 'uuid',
        user_id: 'uuid',
        activity_id: 'uuid',
        read: 'boolean',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
        ai_analysis_id: 'uuid',
        priority: 'text',
        confidence: 'float',
        ai_metadata: 'jsonb'
      },
      constraints: {
        primaryKey: 'notifications_pkey',
        foreignKeys: {
          user_id: 'notifications_user_id_fkey',
          activity_id: 'notifications_activity_id_fkey',
          ai_analysis_id: 'notifications_ai_analysis_id_fkey'
        }
      }
    },
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
    },
    AI_ANALYSES: {
      name: 'ai_analyses',
      fields: {
        id: 'uuid',
        ticket_id: 'uuid',
        type: 'analysis_type',
        created_at: 'timestamptz',
        result: 'jsonb',
        confidence: 'float',
        model_info: 'jsonb',
        feedback_score: 'integer',
        feedback_notes: 'text',
        is_validated: 'boolean',
        validated_at: 'timestamptz',
        validated_by: 'uuid',
        version: 'integer'
      }
    }
  }
} as const

module.exports = {
  SCHEMA
} 
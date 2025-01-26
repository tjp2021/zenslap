const { createClient: createSupabaseClient } = require('@supabase/supabase-js')

class SchemaValidator {
  private client: ReturnType<typeof createSupabaseClient>

  constructor(client: any) {
    this.client = client
  }

  /**
   * Validate the schema by attempting to query each table
   */
  async validateSchema() {
    console.log('Starting schema validation...')
    const errors: string[] = []

    try {
      // Core tables
      console.log('\nTesting core tables...')
      const coreTables = ['tickets', 'ticket_activities', 'users_secure', 'ticket_messages']
      for (const table of coreTables) {
        console.log(`Testing ${table} table...`)
        const { error } = await this.client
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          errors.push(`${table} table error: ${error.message}`)
        }
      }

      // Support tables
      console.log('\nTesting support tables...')
      const supportTables = [
        'ticket_tags',
        'ticket_history',
        'debug_log',
        'internal_notes',
        'notifications',
        'profiles',
        'quick_responses',
        'response_categories',
        'tags'
      ]
      for (const table of supportTables) {
        console.log(`Testing ${table} table...`)
        const { error } = await this.client
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          errors.push(`${table} table error: ${error.message}`)
        }
      }

      if (errors.length > 0) {
        console.error('\nValidation failed with the following errors:')
        throw new Error(errors.join('\n'))
      }

      console.log('\nSchema validation completed successfully!')
      return true
    } catch (error) {
      console.error('\nSchema validation failed with error:', error)
      throw error
    }
  }
}

module.exports = {
  SchemaValidator,
  createSchemaValidator: (client: any) => new SchemaValidator(client)
} 
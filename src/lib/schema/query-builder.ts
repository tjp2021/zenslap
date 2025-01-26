import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { SCHEMA, SchemaTable, TableColumns } from './constants'

export class QueryBuilder<T extends keyof typeof SCHEMA.tables> {
  private table: typeof SCHEMA.tables[T]
  private relations: string[] = []
  private selectedColumns: string[] = []
  private filters: Record<string, any> = {}

  constructor(
    private client: SupabaseClient<Database>,
    tableName: T
  ) {
    this.table = SCHEMA.tables[tableName]
  }

  /**
   * Add a relation to the query using the exact constraint name
   */
  withRelation(constraintName: string, columns: string[]) {
    const relationPath = `${constraintName}(${columns.join(',')})`
    this.relations.push(relationPath)
    return this
  }

  /**
   * Select specific columns from the table
   */
  select(columns: Array<keyof typeof SCHEMA.tables[T]['columns']>) {
    this.selectedColumns = columns as string[]
    return this
  }

  /**
   * Add a filter to the query
   */
  filterBy(column: keyof typeof SCHEMA.tables[T]['columns'], value: any) {
    this.filters[column as string] = value
    return this
  }

  /**
   * Execute the query
   */
  async execute() {
    let query = this.client
      .from(this.table.name)
      .select(this.buildSelect())

    // Apply filters
    Object.entries(this.filters).forEach(([column, value]) => {
      query = query.eq(column, value)
    })

    return query
  }

  private buildSelect(): string {
    const parts: string[] = []
    
    // Add selected columns
    if (this.selectedColumns.length > 0) {
      parts.push(this.selectedColumns.join(','))
    } else {
      parts.push('*')
    }

    // Add relations
    if (this.relations.length > 0) {
      parts.push(this.relations.join(','))
    }

    return parts.join(',')
  }
}

/**
 * Create a new query builder instance
 */
export function createQuery<T extends keyof typeof SCHEMA.tables>(
  client: SupabaseClient<Database>,
  tableName: T
) {
  return new QueryBuilder<T>(client, tableName)
} 
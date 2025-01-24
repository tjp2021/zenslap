export type BaseVariableType = 'text' | 'number' | 'date' | 'select'

export interface Variable {
  name: string
  type: BaseVariableType
  required: boolean
  defaultValue?: string
  options?: string[] // Only for select type
}

// Common system variables
export const SYSTEM_VARIABLES: Variable[] = [
  { name: 'customer_name', type: 'text', required: true },
  { name: 'ticket_id', type: 'text', required: true },
  { name: 'agent_name', type: 'text', required: true },
  { name: 'date', type: 'date', required: false, defaultValue: new Date().toLocaleDateString() }
] 
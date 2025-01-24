import { Variable } from '../types/variables'

export function extractVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g) || []
  return matches.map(match => match.slice(1, -1).trim())
}

export function substituteVariables(
  content: string,
  values: Record<string, string>
): string {
  return content.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = values[key.trim()]
    return value !== undefined ? value : match
  })
}

export function validateVariable(value: string, variable: Variable): boolean {
  if (variable.required && !value) {
    return false
  }

  switch (variable.type) {
    case 'number':
      return !isNaN(Number(value))
    case 'date':
      return !isNaN(Date.parse(value))
    case 'select':
      return variable.options?.includes(value) ?? false
    default:
      return true
  }
}

export function getDefaultValue(variable: Variable): string {
  if (variable.defaultValue) {
    return variable.defaultValue
  }

  switch (variable.type) {
    case 'date':
      return new Date().toLocaleDateString()
    case 'number':
      return '0'
    default:
      return ''
  }
} 
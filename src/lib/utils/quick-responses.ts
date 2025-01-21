export function substituteVariables(
  content: string,
  variables: Record<string, string>
): string {
  return content.replace(/\{([^}]+)\}/g, (match, key) => {
    return variables[key.trim()] || match
  })
}

export function extractVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g) || []
  return matches.map(match => match.slice(1, -1).trim())
}

// Example usage:
// const template = "Hello {customer_name}, your ticket #{ticket_id} is being processed."
// const variables = { customer_name: "John", ticket_id: "123" }
// const result = substituteVariables(template, variables)
// -> "Hello John, your ticket #123 is being processed." 
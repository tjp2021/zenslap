import { substituteVariables, extractVariables } from '../quick-responses'

describe('Quick Response Utils', () => {
  describe('substituteVariables', () => {
    it('replaces variables in content', () => {
      const content = 'Hello {name}, ticket #{id} is ready'
      const variables = { name: 'John', id: '123' }
      
      expect(substituteVariables(content, variables))
        .toBe('Hello John, ticket #123 is ready')
    })

    it('keeps original placeholder if variable not provided', () => {
      const content = 'Hello {name}, ticket #{id}'
      const variables = { name: 'John' }
      
      expect(substituteVariables(content, variables))
        .toBe('Hello John, ticket #{id}')
    })
  })

  describe('extractVariables', () => {
    it('extracts all variables from content', () => {
      const content = 'Hello {name}, ticket #{id} status: {status}'
      const variables = extractVariables(content)
      
      expect(variables).toEqual(['name', 'id', 'status'])
    })

    it('returns empty array if no variables found', () => {
      const content = 'Hello there!'
      const variables = extractVariables(content)
      
      expect(variables).toEqual([])
    })
  })
}) 
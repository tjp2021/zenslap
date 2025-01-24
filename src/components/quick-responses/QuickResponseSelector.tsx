import { useState } from 'react'
import { useCategories, useResponses } from '@/lib/hooks/useQuickResponses'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { extractVariables, substituteVariables } from '@/lib/utils/variables'
import { SYSTEM_VARIABLES } from '@/lib/types/variables'
import { QuickResponse, ResponseCategory } from '@/lib/types/quick-responses'

interface QuickResponseSelectorProps {
  onSelect: (content: string) => void
  ticketData?: {
    customer_name?: string
    ticket_id?: string
    agent_name?: string
  }
}

export function QuickResponseSelector({ onSelect, ticketData }: QuickResponseSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>()
  
  const { data: categories, isLoading: loadingCategories } = useCategories()
  const { data: responses, isLoading: loadingResponses } = useResponses(selectedCategory)

  const handleSelect = (content: string) => {
    // Get all variables in the template
    const templateVars = extractVariables(content)
    
    // Create values object from ticketData and system defaults
    const values: Record<string, string> = {}
    templateVars.forEach(varName => {
      // First try ticket data
      if (ticketData && varName in ticketData) {
        values[varName] = ticketData[varName as keyof typeof ticketData] || ''
      } else {
        // Fall back to system defaults
        const sysVar = SYSTEM_VARIABLES.find(v => v.name === varName)
        if (sysVar?.defaultValue) {
          values[varName] = sysVar.defaultValue
        }
      }
    })

    // Replace variables in content
    const finalContent = substituteVariables(content, values)
    onSelect(finalContent)
  }

  if (loadingCategories) {
    return <div>Loading categories...</div>
  }

  return (
    <div className="space-y-4">
      <Select
        value={selectedCategory}
        onValueChange={setSelectedCategory}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {categories?.map((category: ResponseCategory) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCategory && (
        <ScrollArea className="h-[300px]">
          {loadingResponses ? (
            <div>Loading responses...</div>
          ) : (
            <div className="space-y-2">
              {responses?.map((response: QuickResponse) => (
                <Card
                  key={response.id}
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSelect(response.content)}
                >
                  <h3 className="font-medium">{response.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {response.content}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  )
} 
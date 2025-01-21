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

interface QuickResponseSelectorProps {
  onSelect: (content: string) => void
  className?: string
}

export function QuickResponseSelector({ onSelect, className }: QuickResponseSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>()
  
  const { data: categories, isLoading: loadingCategories } = useCategories()
  const { data: responses, isLoading: loadingResponses } = useResponses(selectedCategory)

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
          {categories?.map((category) => (
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
              {responses?.map((response) => (
                <Card
                  key={response.id}
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => onSelect(response.content)}
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
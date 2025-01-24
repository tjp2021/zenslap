import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QuickResponseEditor } from './QuickResponseEditor'
import { QuickResponse, ResponseCategory } from '@/lib/types/quick-responses'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/lib/hooks/useQuickResponses'

interface QuickResponseFormProps {
  response?: QuickResponse
  onSubmit: (data: { title: string; content: string; category_id: string }) => Promise<void>
  onCancel: () => void
}

export function QuickResponseForm({ response, onSubmit, onCancel }: QuickResponseFormProps) {
  const [title, setTitle] = useState(response?.title || '')
  const [content, setContent] = useState(response?.content || '')
  const [categoryId, setCategoryId] = useState(response?.category_id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: categories, isLoading } = useCategories()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content || !categoryId) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({ title, content, category_id: categoryId })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div>Loading categories...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Response title..."
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          required
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
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Template Content
        </label>
        <QuickResponseEditor
          initialContent={content}
          onChange={setContent}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !title || !content || !categoryId}
        >
          {isSubmitting ? 'Saving...' : response ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
} 
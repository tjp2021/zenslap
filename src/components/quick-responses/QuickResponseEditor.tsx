import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { VariablePicker } from './VariablePicker'

interface QuickResponseEditorProps {
  initialContent?: string
  onChange: (content: string) => void
}

export function QuickResponseEditor({ initialContent = '', onChange }: QuickResponseEditorProps) {
  const [content, setContent] = useState(initialContent)

  const handleVariableSelect = (variable: string) => {
    const textarea = document.querySelector('textarea')
    const start = textarea?.selectionStart || 0
    const end = textarea?.selectionEnd || 0
    
    const newContent = content.slice(0, start) + variable + content.slice(end)
    setContent(newContent)
    onChange(newContent)
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <VariablePicker onSelect={handleVariableSelect} />
      </div>
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          onChange(e.target.value)
        }}
        placeholder="Type your response template here..."
        className="min-h-[200px]"
      />
    </div>
  )
} 
import { useCallback } from 'react'
import type { ClipboardEvent } from 'react'
import { EditorContent } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { RichTextEditorProps } from './RichTextEditor.types'
import { useRichTextEditor } from './useRichTextEditor'
import { EditorProvider } from './EditorContext'
import { Toolbar } from './components/Toolbar/Toolbar'
import { ErrorBoundary } from '@/components/ui/error-boundary'

function RichTextEditorContent({
  initialContent,
  onChange,
  readOnly = false,
  className,
  placeholder = 'Start typing...',
  maxLength,
  showToolbar = true,
  enableImages = true,
  enableMentions = true,
  id,
}: RichTextEditorProps) {
  const {
    editor,
    content,
    wordCount,
    isEditable,
  } = useRichTextEditor({
    initialContent,
    onChange,
    readOnly,
    placeholder,
    maxLength,
    enableImages,
    enableMentions,
  })

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (!editor || !maxLength) return

      const text = event.clipboardData?.getData('text/plain') || ''
      if (content.length + text.length > maxLength) {
        event.preventDefault()
      }
    },
    [editor, content.length, maxLength]
  )

  if (!editor) {
    return (
      <div className="animate-pulse">
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden dark:border-gray-700',
        'focus-within:ring-2 focus-within:ring-blue-500',
        className
      )}
      id={id}
    >
      {showToolbar && isEditable && <Toolbar />}
      
      <div className="relative">
        <EditorContent
          editor={editor}
          className={cn(
            'min-h-[200px] p-4',
            'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none',
            'focus:outline-none'
          )}
          onPaste={handlePaste}
        />
        
        {!content && (
          <div className="absolute top-0 left-0 p-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {maxLength && (
        <div className="flex justify-end px-4 py-2 text-sm text-gray-500 border-t dark:border-gray-700">
          {wordCount} / {maxLength} characters
        </div>
      )}
    </div>
  )
}

export function RichTextEditor(props: RichTextEditorProps) {
  return (
    <ErrorBoundary>
      <EditorProvider>
        <RichTextEditorContent {...props} />
      </EditorProvider>
    </ErrorBoundary>
  )
} 
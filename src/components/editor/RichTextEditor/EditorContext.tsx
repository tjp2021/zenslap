import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { EditorContextValue } from './RichTextEditor.types'

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    editor?.commands.clearContent()
    setError(null)
    setIsLoading(false)
    setIsFocused(false)
  }, [editor])

  const value = useMemo(
    () => ({
      editor,
      isFocused,
      isLoading,
      error,
      reset,
      setEditor,
      setIsFocused,
      setIsLoading,
      setError,
    }),
    [editor, isFocused, isLoading, error, reset]
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
} 
import { Editor } from '@tiptap/react'

export interface RichTextEditorProps {
  /** Initial content for the editor */
  initialContent?: string
  /** Callback when content changes */
  onChange?: (content: string) => void
  /** Whether the editor is in read-only mode */
  readOnly?: boolean
  /** Additional CSS classes */
  className?: string
  /** Placeholder text when editor is empty */
  placeholder?: string
  /** Maximum content length */
  maxLength?: number
  /** Whether to show the toolbar */
  showToolbar?: boolean
  /** Whether to enable image uploads */
  enableImages?: boolean
  /** Whether to enable mentions */
  enableMentions?: boolean
  /** Optional ID for the editor */
  id?: string
}

export interface EditorContextValue {
  /** The TipTap editor instance */
  editor: Editor | null
  /** Whether the editor is currently focused */
  isFocused: boolean
  /** Whether content is being loaded */
  isLoading: boolean
  /** Any error that occurred */
  error: Error | null
  /** Reset the editor state */
  reset: () => void
}

export type ToolbarButtonProps = {
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>
  /** Button title */
  title: string
  /** Whether the button is active */
  isActive?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Click handler */
  onClick: () => void
  /** Additional CSS classes */
  className?: string
} 
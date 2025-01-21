import { useCallback, useEffect, useState } from 'react'
import { useEditor as useTipTap } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import { RichTextEditorProps } from './RichTextEditor.types'

export function useRichTextEditor({
  initialContent = '',
  onChange,
  readOnly = false,
  placeholder = 'Start typing...',
  maxLength,
  enableImages = true,
  enableMentions = true,
}: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [wordCount, setWordCount] = useState(0)

  // Configure editor extensions
  const extensions = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'cursor-pointer text-blue-500 hover:text-blue-600',
      },
    }),
  ]

  if (enableImages) {
    extensions.push(
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      })
    )
  }

  if (enableMentions) {
    extensions.push(
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
      })
    )
  }

  // Initialize TipTap editor
  const editor = useTipTap({
    extensions,
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML()
      setContent(newContent)
      onChange?.(newContent)
      setWordCount(editor.storage.characterCount.words())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  })

  // Handle content updates
  const updateContent = useCallback(
    (newContent: string) => {
      if (maxLength && newContent.length > maxLength) {
        return
      }
      editor?.commands.setContent(newContent)
    },
    [editor, maxLength]
  )

  // Reset editor content
  const reset = useCallback(() => {
    editor?.commands.clearContent()
  }, [editor])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return {
    editor,
    content,
    wordCount,
    updateContent,
    reset,
    isEditable: !readOnly,
  }
} 
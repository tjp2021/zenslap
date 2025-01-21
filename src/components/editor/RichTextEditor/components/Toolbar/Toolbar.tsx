import { useEditor } from '../../EditorContext'
import { ToolbarButtonProps } from '../../RichTextEditor.types'
import { cn } from '@/lib/utils'

// Icons
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
} from 'lucide-react'

function ToolbarButton({
  icon: Icon,
  title,
  isActive,
  disabled,
  onClick,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isActive && 'bg-gray-200 dark:bg-gray-700',
        className
      )}
      title={title}
      aria-label={title}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}

export function Toolbar() {
  const editor = useEditor()
  if (!editor) return null

  const toggleBold = () => editor.chain().focus().toggleBold().run()
  const toggleItalic = () => editor.chain().focus().toggleItalic().run()
  const toggleH1 = () => editor.chain().focus().toggleHeading({ level: 1 }).run()
  const toggleH2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run()
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run()
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run()
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run()

  return (
    <div
      className="flex flex-wrap gap-1 p-2 border-b dark:border-gray-700"
      role="toolbar"
      aria-label="Text formatting options"
    >
      <ToolbarButton
        icon={Bold}
        title="Bold"
        isActive={editor.isActive('bold')}
        onClick={toggleBold}
      />
      <ToolbarButton
        icon={Italic}
        title="Italic"
        isActive={editor.isActive('italic')}
        onClick={toggleItalic}
      />
      <div className="w-px h-6 mx-1 bg-gray-300 dark:bg-gray-700" role="separator" />
      <ToolbarButton
        icon={Heading1}
        title="Heading 1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={toggleH1}
      />
      <ToolbarButton
        icon={Heading2}
        title="Heading 2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={toggleH2}
      />
      <div className="w-px h-6 mx-1 bg-gray-300 dark:bg-gray-700" role="separator" />
      <ToolbarButton
        icon={List}
        title="Bullet List"
        isActive={editor.isActive('bulletList')}
        onClick={toggleBulletList}
      />
      <ToolbarButton
        icon={ListOrdered}
        title="Ordered List"
        isActive={editor.isActive('orderedList')}
        onClick={toggleOrderedList}
      />
      <ToolbarButton
        icon={Quote}
        title="Blockquote"
        isActive={editor.isActive('blockquote')}
        onClick={toggleBlockquote}
      />
    </div>
  )
} 
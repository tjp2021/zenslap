import { useCallback, useState } from 'react'
import { InternalNote } from '@/lib/types'
import { Card, Button, Textarea } from '@/components/ui'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface NoteListProps {
    notes: InternalNote[]
    currentUserId: string
    onUpdate?: (id: string, content: string) => Promise<void>
    onDelete?: (id: string) => Promise<void>
    isUpdating?: boolean
    isDeleting?: boolean
    className?: string
}

interface EditableNoteProps extends InternalNote {
    currentUserId: string
    onUpdate?: (id: string, content: string) => Promise<void>
    onDelete?: (id: string) => Promise<void>
    isUpdating?: boolean
    isDeleting?: boolean
}

function EditableNote({
    id,
    content,
    created_by,
    created_at,
    currentUserId,
    onUpdate,
    onDelete,
    isUpdating,
    isDeleting
}: EditableNoteProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedContent, setEditedContent] = useState(content)
    const canModify = currentUserId === created_by

    const handleUpdate = useCallback(async () => {
        if (!onUpdate || editedContent === content || isUpdating) return
        
        try {
            await onUpdate(id, editedContent)
            setIsEditing(false)
        } catch (error) {
            // Error is handled by parent component
            setEditedContent(content)
        }
    }, [id, content, editedContent, onUpdate, isUpdating])

    const handleCancel = useCallback(() => {
        setIsEditing(false)
        setEditedContent(content)
    }, [content])

    const handleDelete = useCallback(async () => {
        if (!onDelete || isDeleting) return
        await onDelete(id)
    }, [id, onDelete, isDeleting])

    return (
        <Card className="p-4">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    {isEditing ? (
                        <Textarea
                            value={editedContent}
                            onChange={e => setEditedContent(e.target.value)}
                            className="min-h-[100px] resize-none"
                            placeholder="Enter note content..."
                            disabled={isUpdating}
                            aria-label="Edit note"
                        />
                    ) : (
                        <p className="whitespace-pre-wrap">{content}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                        {format(new Date(created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                </div>

                {canModify && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleUpdate}
                                    disabled={isUpdating || content === editedContent}
                                    className={cn(
                                        'hover:bg-primary/20',
                                        isUpdating && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    <Check className="h-4 w-4" />
                                    <span className="sr-only">Save note</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancel}
                                    disabled={isUpdating}
                                    className="hover:bg-destructive/20"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Cancel editing</span>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsEditing(true)}
                                    disabled={isUpdating}
                                    className="hover:bg-primary/20"
                                >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit note</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className={cn(
                                        'hover:bg-destructive/20',
                                        isDeleting && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete note</span>
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Card>
    )
}

export function NoteList({
    notes,
    currentUserId,
    onUpdate,
    onDelete,
    isUpdating,
    isDeleting,
    className
}: NoteListProps) {
    if (!notes.length) {
        return (
            <p className={cn('text-sm text-muted-foreground text-center py-4', className)}>
                No internal notes yet
            </p>
        )
    }

    return (
        <div className={cn('space-y-4', className)}>
            {notes.map(note => (
                <EditableNote
                    key={note.id}
                    {...note}
                    currentUserId={currentUserId}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    isUpdating={isUpdating}
                    isDeleting={isDeleting}
                />
            ))}
        </div>
    )
} 
import { useCallback, useState } from 'react'
import { TicketMessage } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface MessageListProps {
    messages: TicketMessage[]
    currentUserId: string
    onUpdate?: (id: string, content: string) => Promise<void>
    onDelete?: (id: string) => Promise<void>
    isUpdating?: boolean
    isDeleting?: boolean
    className?: string
}

interface EditableMessageProps extends TicketMessage {
    currentUserId: string
    onUpdate?: (id: string, content: string) => Promise<void>
    onDelete?: (id: string) => Promise<void>
    isUpdating?: boolean
    isDeleting?: boolean
}

function EditableMessage({
    id,
    content,
    type,
    created_by,
    created_at,
    currentUserId,
    onUpdate,
    onDelete,
    isUpdating,
    isDeleting
}: EditableMessageProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedContent, setEditedContent] = useState(content)
    const canModify = currentUserId === created_by

    const handleUpdate = useCallback(async () => {
        if (!onUpdate || editedContent === content) {
            setIsEditing(false)
            return
        }

        try {
            await onUpdate(id, editedContent)
            setIsEditing(false)
        } catch (error) {
            // Error is handled by parent component
            setEditedContent(content)
        }
    }, [id, content, editedContent, onUpdate])

    const handleCancel = useCallback(() => {
        setIsEditing(false)
        setEditedContent(content)
    }, [content])

    const handleDelete = useCallback(async () => {
        if (!onDelete) return
        await onDelete(id)
    }, [id, onDelete])

    return (
        <Card className={cn(
            'p-4',
            type === 'agent' ? 'bg-primary/5' : 'bg-background'
        )}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    {isEditing ? (
                        <Textarea
                            value={editedContent}
                            onChange={e => setEditedContent(e.target.value)}
                            className="min-h-[100px]"
                            disabled={isUpdating}
                        />
                    ) : (
                        <p className="whitespace-pre-wrap">{content}</p>
                    )}
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                        <span className="capitalize">{type}</span>
                        <span>{format(new Date(created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
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
                                >
                                    <Check className="h-4 w-4" />
                                    <span className="sr-only">Save</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancel}
                                    disabled={isUpdating}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Cancel</span>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsEditing(true)}
                                    disabled={isUpdating}
                                >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="hover:bg-destructive/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Card>
    )
}

export function MessageList({
    messages,
    currentUserId,
    onUpdate,
    onDelete,
    isUpdating,
    isDeleting,
    className
}: MessageListProps) {
    if (!messages.length) {
        return (
            <p className={cn('text-sm text-muted-foreground text-center py-4', className)}>
                No messages yet
            </p>
        )
    }

    return (
        <div className={cn('space-y-4', className)}>
            {messages.map(message => (
                <EditableMessage
                    key={message.id}
                    {...message}
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
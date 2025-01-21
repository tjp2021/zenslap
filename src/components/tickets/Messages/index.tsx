import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messages } from '@/lib/api/routes/messages'
import { MessageList } from './MessageList'
import { MessageForm } from './MessageForm'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Alert } from '@/components/ui/alert'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'

interface MessagesProps {
    ticketId: string
    userId: string
    userType: 'agent' | 'customer'
    readOnly?: boolean
    className?: string
}

export function Messages({ 
    ticketId, 
    userId, 
    userType, 
    readOnly = false, 
    className 
}: MessagesProps) {
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()

    // Fetch messages
    const { data: messageList, isLoading } = useQuery({
        queryKey: ['messages', ticketId],
        queryFn: async () => {
            const result = await messages.getByTicketId(ticketId)
            if (result.error) throw result.error
            return result.data || []
        }
    })

    // Create message mutation
    const createMessage = useMutation({
        mutationFn: async (content: string) => {
            const result = await messages.create({
                ticket_id: ticketId,
                content,
                type: userType
            }, userId)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', ticketId] })
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
    })

    // Update message mutation
    const updateMessage = useMutation({
        mutationFn: async ({ id, content }: { id: string; content: string }) => {
            const result = await messages.update(id, content, userId)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', ticketId] })
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
    })

    // Delete message mutation
    const deleteMessage = useMutation({
        mutationFn: async (id: string) => {
            const result = await messages.delete(id, userId)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', ticketId] })
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
    })

    const handleCreateMessage = useCallback(async (content: string) => {
        await createMessage.mutateAsync(content)
    }, [createMessage])

    const handleUpdateMessage = useCallback(async (id: string, content: string) => {
        await updateMessage.mutateAsync({ id, content })
    }, [updateMessage])

    const handleDeleteMessage = useCallback(async (id: string) => {
        await deleteMessage.mutateAsync(id)
    }, [deleteMessage])

    if (isLoading) {
        return <LoadingOverlay />
    }

    return (
        <ErrorBoundary>
            <div className={className}>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        {error}
                    </Alert>
                )}

                <MessageList
                    messages={messageList || []}
                    currentUserId={userId}
                    onUpdate={!readOnly ? handleUpdateMessage : undefined}
                    onDelete={!readOnly ? handleDeleteMessage : undefined}
                    isUpdating={updateMessage.isPending}
                    isDeleting={deleteMessage.isPending}
                    className="mb-4"
                />

                {!readOnly && (
                    <MessageForm
                        onSubmit={handleCreateMessage}
                        isLoading={createMessage.isPending}
                    />
                )}
            </div>
        </ErrorBoundary>
    )
} 
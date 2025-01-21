import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messages } from '@/lib/api/routes/messages'

interface UseMessagesOptions {
    ticketId: string
    userId: string
    userType: 'agent' | 'customer'
    onError?: (error: Error) => void
}

export function useMessages({ ticketId, userId, userType, onError }: UseMessagesOptions) {
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
        },
        onError
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
        },
        onError
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
        },
        onError
    })

    return {
        // Data
        messages: messageList,
        
        // Loading states
        isLoading,
        isCreating: createMessage.isPending,
        isUpdating: updateMessage.isPending,
        isDeleting: deleteMessage.isPending,

        // Actions
        createMessage: createMessage.mutateAsync,
        updateMessage: updateMessage.mutateAsync,
        deleteMessage: deleteMessage.mutateAsync
    }
} 
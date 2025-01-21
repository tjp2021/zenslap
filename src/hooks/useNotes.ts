import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InternalNote } from '@/lib/types'
import { internalNotes } from '@/lib/api/routes/internal-notes'

interface UseNotesOptions {
    ticketId: string
    userId: string
    onError?: (error: Error) => void
}

export function useNotes({ ticketId, userId, onError }: UseNotesOptions) {
    const queryClient = useQueryClient()

    // Fetch notes
    const { data: notes, isLoading } = useQuery({
        queryKey: ['internal-notes', ticketId],
        queryFn: async () => {
            const result = await internalNotes.getByTicketId(ticketId)
            if (result.error) throw result.error
            return result.data || []
        }
    })

    // Create note mutation
    const createNote = useMutation({
        mutationFn: async (content: string) => {
            const result = await internalNotes.create({
                ticket_id: ticketId,
                content
            }, userId)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-notes', ticketId] })
        },
        onError
    })

    // Update note mutation
    const updateNote = useMutation({
        mutationFn: async ({ id, content }: { id: string; content: string }) => {
            const result = await internalNotes.update(id, content, userId)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-notes', ticketId] })
        },
        onError
    })

    // Delete note mutation
    const deleteNote = useMutation({
        mutationFn: async (id: string) => {
            const result = await internalNotes.delete(id, userId)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal-notes', ticketId] })
        },
        onError
    })

    return {
        // Data
        notes,
        
        // Loading states
        isLoading,
        isCreating: createNote.isPending,
        isUpdating: updateNote.isPending,
        isDeleting: deleteNote.isPending,

        // Actions
        createNote: createNote.mutateAsync,
        updateNote: updateNote.mutateAsync,
        deleteNote: deleteNote.mutateAsync
    }
} 
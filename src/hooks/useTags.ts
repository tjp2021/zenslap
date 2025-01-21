import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag } from '@/lib/types'
import { tags } from '@/lib/api/routes/tags'

interface UseTagsOptions {
    ticketId?: string
    onError?: (error: Error) => void
}

export function useTags({ ticketId, onError }: UseTagsOptions = {}) {
    const queryClient = useQueryClient()

    // Fetch all tags
    const { data: allTags, isLoading: isLoadingAll } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const result = await tags.getAll()
            if (result.error) throw result.error
            return result.data || []
        }
    })

    // Fetch ticket-specific tags
    const { data: ticketTags, isLoading: isLoadingTicket } = useQuery({
        queryKey: ['tags', ticketId],
        queryFn: async () => {
            if (!ticketId) return []
            const result = await tags.getByTicketId(ticketId)
            if (result.error) throw result.error
            return result.data || []
        },
        enabled: !!ticketId
    })

    // Create tag mutation
    const createTag = useMutation({
        mutationFn: async (data: { name: string; color: string }) => {
            const result = await tags.create(data)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
        },
        onError
    })

    // Delete tag mutation
    const deleteTag = useMutation({
        mutationFn: async (id: string) => {
            const result = await tags.delete(id)
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
        },
        onError
    })

    // Associate tag with ticket mutation
    const associateTag = useMutation({
        mutationFn: async ({ ticketId, tagId }: { ticketId: string; tagId: string }) => {
            // Using update method to associate tag with ticket
            const result = await tags.update(tagId, {
                ticket_ids: [ticketId]
            })
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags', ticketId] })
        },
        onError
    })

    // Dissociate tag from ticket mutation
    const dissociateTag = useMutation({
        mutationFn: async ({ ticketId, tagId }: { ticketId: string; tagId: string }) => {
            // Using update method to remove tag from ticket
            const result = await tags.update(tagId, {
                ticket_ids: []  // Remove the ticket ID
            })
            if (result.error) throw result.error
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags', ticketId] })
        },
        onError
    })

    return {
        // Data
        allTags,
        ticketTags,
        
        // Loading states
        isLoading: isLoadingAll || isLoadingTicket,
        isCreating: createTag.isPending,
        isDeleting: deleteTag.isPending,
        isAssociating: associateTag.isPending,
        isDissociating: dissociateTag.isPending,

        // Actions
        createTag: createTag.mutateAsync,
        deleteTag: deleteTag.mutateAsync,
        associateTag: associateTag.mutateAsync,
        dissociateTag: dissociateTag.mutateAsync
    }
} 
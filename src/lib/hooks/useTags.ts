interface Tag {
    id: string
    name: string
    created_at: string
}

export function useTags(ticketId?: string) {
    // Data
    const allTags: Tag[] = []
    const ticketTags: Tag[] = []
    
    // Loading states
    const isLoadingAll = false
    const isLoadingTicket = false
    const createTag = { isPending: false, mutateAsync: async (name: string) => {} }
    const deleteTag = { isPending: false, mutateAsync: async (id: string) => {} }
    const associateTag = { isPending: false, mutateAsync: async (tagId: string) => {} }
    const dissociateTag = { isPending: false, mutateAsync: async (tagId: string) => {} }

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
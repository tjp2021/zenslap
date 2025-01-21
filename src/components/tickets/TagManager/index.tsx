import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag } from '@/lib/types'
import { tags } from '@/lib/api/routes/tags'
import { TagList } from './TagList'
import { TagForm } from './TagForm'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Alert } from '@/components/ui/alert'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'

interface TagManagerProps {
    ticketId?: string
    readOnly?: boolean
    onTagsChange?: (tags: Tag[]) => void
    className?: string
}

export function TagManager({ ticketId, readOnly = false, onTagsChange, className }: TagManagerProps) {
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()

    // Fetch all tags for selection
    const { data: allTags, isLoading: isLoadingAll } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const result = await tags.getAll()
            if (result.error) throw result.error
            return result.data || []
        }
    })

    // Fetch ticket-specific tags if ticketId is provided
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
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
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
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
    })

    const handleCreateTag = useCallback(async (data: { name: string; color: string }) => {
        await createTag.mutateAsync(data)
    }, [createTag])

    const handleDeleteTag = useCallback(async (id: string) => {
        await deleteTag.mutateAsync(id)
    }, [deleteTag])

    // Notify parent of changes
    const handleTagsChange = useCallback((tags: Tag[]) => {
        onTagsChange?.(tags)
    }, [onTagsChange])

    if (isLoadingAll || isLoadingTicket) {
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
                
                {!readOnly && (
                    <TagForm 
                        onSubmit={handleCreateTag} 
                        isLoading={createTag.isPending}
                        className="mb-4"
                    />
                )}

                <TagList
                    tags={allTags || []}
                    selectedTags={ticketTags || []}
                    onDelete={!readOnly ? handleDeleteTag : undefined}
                    onChange={!readOnly ? handleTagsChange : undefined}
                    isDeleting={deleteTag.isPending}
                />
            </div>
        </ErrorBoundary>
    )
} 
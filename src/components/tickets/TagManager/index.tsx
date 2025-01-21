import { useState } from 'react'
import { Tag } from '@/lib/types'
import { useTags } from '@/hooks/useTags'
import { TagList } from './TagList'
import { TagForm } from './TagForm'
import {
    Alert,
    AlertDescription,
    ErrorBoundary,
    LoadingSpinner
} from '@/components/ui'

interface TagManagerProps {
    ticketId?: string
    readOnly?: boolean
    onTagsChange?: (tags: Tag[]) => void
    className?: string
}

export function TagManager({ ticketId, readOnly = false, onTagsChange, className }: TagManagerProps) {
    const [error, setError] = useState<string | null>(null)

    const {
        allTags,
        ticketTags,
        isLoading,
        isCreating,
        isDeleting,
        createTag,
        deleteTag,
        associateTag,
        dissociateTag
    } = useTags({
        ticketId,
        onError: (err: Error) => setError(err.message)
    })

    // Handle tag selection changes
    const handleTagsChange = async (selectedTags: Tag[]) => {
        if (!ticketId) return

        try {
            // Find tags to add and remove
            const currentTagIds = new Set(ticketTags?.map(t => t.id) || [])
            const selectedTagIds = new Set(selectedTags.map(t => t.id))

            // Tags to add
            for (const tag of selectedTags) {
                if (!currentTagIds.has(tag.id)) {
                    await associateTag({ ticketId, tagId: tag.id })
                }
            }

            // Tags to remove
            for (const tag of ticketTags || []) {
                if (!selectedTagIds.has(tag.id)) {
                    await dissociateTag({ ticketId, tagId: tag.id })
                }
            }

            onTagsChange?.(selectedTags)
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            }
        }
    }

    if (isLoading) {
        return <LoadingSpinner />
    }

    return (
        <ErrorBoundary>
            <div className={className}>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                
                {!readOnly && (
                    <TagForm 
                        onSubmit={createTag} 
                        isLoading={isCreating}
                        className="mb-4"
                    />
                )}

                <TagList
                    tags={allTags || []}
                    selectedTags={ticketTags || []}
                    onDelete={!readOnly ? deleteTag : undefined}
                    onChange={!readOnly ? handleTagsChange : undefined}
                    isDeleting={isDeleting}
                />
            </div>
        </ErrorBoundary>
    )
} 
import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { internalNotes } from '@/lib/api/routes/internal-notes'
import { NoteList } from './NoteList'
import { NoteForm } from './NoteForm'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Alert } from '@/components/ui/alert'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'

interface InternalNotesProps {
    ticketId: string
    userId: string
    readOnly?: boolean
    className?: string
}

export function InternalNotes({ ticketId, userId, readOnly = false, className }: InternalNotesProps) {
    const [error, setError] = useState<string | null>(null)
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
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
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
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
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
            setError(null)
        },
        onError: (err: Error) => {
            setError(err.message)
        }
    })

    const handleCreateNote = useCallback(async (content: string) => {
        await createNote.mutateAsync(content)
    }, [createNote])

    const handleUpdateNote = useCallback(async (id: string, content: string) => {
        await updateNote.mutateAsync({ id, content })
    }, [updateNote])

    const handleDeleteNote = useCallback(async (id: string) => {
        await deleteNote.mutateAsync(id)
    }, [deleteNote])

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

                {!readOnly && (
                    <NoteForm
                        onSubmit={handleCreateNote}
                        isLoading={createNote.isPending}
                        className="mb-4"
                    />
                )}

                <NoteList
                    notes={notes || []}
                    currentUserId={userId}
                    onUpdate={!readOnly ? handleUpdateNote : undefined}
                    onDelete={!readOnly ? handleDeleteNote : undefined}
                    isUpdating={updateNote.isPending}
                    isDeleting={deleteNote.isPending}
                />
            </div>
        </ErrorBoundary>
    )
} 
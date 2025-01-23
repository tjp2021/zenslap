import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { internalNotes } from '@/lib/api/routes/internal-notes'
import { NoteList } from './NoteList'
import { NoteForm } from './NoteForm'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Alert } from '@/components/ui/alert'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { UserRole } from '@/lib/types'
import { PermissionGate } from '@/components/auth/PermissionGate'

interface InternalNotesProps {
    ticketId: string
    userId: string
    userRole: UserRole
    readOnly?: boolean
    className?: string
}

export function InternalNotes({ 
    ticketId, 
    userId, 
    userRole,
    readOnly = false, 
    className 
}: InternalNotesProps) {
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()

    // Fetch notes
    const { data: notes, isLoading: notesLoading } = useQuery({
        queryKey: ['internal-notes', ticketId],
        queryFn: async () => {
            const result = await internalNotes.getByTicketId(ticketId)
            if (result.error) throw result.error
            return result.data || []
        }
    })

    // Fetch mentionable users (admin and agents)
    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['mentionable-users'],
        queryFn: async () => {
            const result = await fetch('/api/users/mentionable')
            if (!result.ok) throw new Error('Failed to fetch mentionable users')
            return result.json()
        }
    })

    // Create note mutation
    const createNote = useMutation({
        mutationFn: async ({ content, mentions }: { content: string; mentions: string[] }) => {
            const result = await internalNotes.create({
                ticket_id: ticketId,
                content,
                mentions
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

    const handleCreateNote = useCallback(async (content: string, mentions: string[]) => {
        await createNote.mutateAsync({ content, mentions })
    }, [createNote])

    const handleUpdateNote = useCallback(async (id: string, content: string) => {
        await updateNote.mutateAsync({ id, content })
    }, [updateNote])

    const handleDeleteNote = useCallback(async (id: string) => {
        await deleteNote.mutateAsync(id)
    }, [deleteNote])

    if (notesLoading || usersLoading) {
        return <LoadingOverlay />
    }

    return (
        <PermissionGate
            requiredRoles={[UserRole.ADMIN, UserRole.AGENT]}
            fallback={null}
        >
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
                            users={users || []}
                            currentUserRole={userRole}
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
        </PermissionGate>
    )
} 
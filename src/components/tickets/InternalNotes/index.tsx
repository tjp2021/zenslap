'use client'

import { useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { NoteList } from './NoteList'
import { NoteForm } from './NoteForm'
import { UserRole } from '@/lib/types'

interface User {
  id: string
  email: string
  role: UserRole
}

interface InternalNotesProps {
  ticketId: string
  userId: string
  userRole: UserRole
  readOnly?: boolean
  className?: string
}

export function InternalNotes({ ticketId, userId, userRole, readOnly = false, className }: InternalNotesProps) {
  const supabase = createClientComponentClient<Database>()
  const queryClient = useQueryClient()

  // Fetch notes for this ticket
  const { data: notes, isLoading: notesLoading, error: notesError } = useQuery({
    queryKey: ['notes', ticketId],
    queryFn: async () => {
      console.log('🔍 InternalNotes - Fetching notes for ticket:', ticketId)
      const { data, error } = await supabase
        .from('internal_notes')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) throw error
      console.log(`✅ InternalNotes - Fetched ${data?.length || 0} notes`)
      return data || []
    }
  })

  // Fetch mentionable users (admins and agents)
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async () => {
      console.log('🔍 InternalNotes - Fetching mentionable users')
      const { data, error } = await supabase
        .from('users_secure')
        .select('*')
        .in('role', ['admin', 'agent'])

      if (error) throw error
      console.log(`✅ InternalNotes - Fetched ${data?.length || 0} mentionable users`)
      return (data || []) as User[]
    }
  })

  // Create note mutation
  const { mutate: createNote, isPending: isCreating } = useMutation({
    mutationFn: async ({ content, mentions }: { content: string, mentions?: string[] }) => {
      const { data, error } = await supabase
        .from('internal_notes')
        .insert([
          {
            ticket_id: ticketId,
            content,
            created_by: userId,
            mentions
          }
        ])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticketId] })
    }
  })

  // Update note mutation
  const { mutate: updateNote, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, content }: { id: string, content: string }) => {
      const { data, error } = await supabase
        .from('internal_notes')
        .update({ content })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticketId] })
    }
  })

  // Delete note mutation
  const { mutate: deleteNote, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('internal_notes')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticketId] })
    }
  })

  const handleCreateNote = useCallback(async (content: string, mentions?: string[]) => {
    await createNote({ content, mentions })
  }, [createNote])

  const handleUpdateNote = useCallback(async (id: string, content: string) => {
    await updateNote({ id, content })
  }, [updateNote])

  const handleDeleteNote = useCallback(async (id: string) => {
    await deleteNote(id)
  }, [deleteNote])

  if (notesError || usersError) {
    return (
      <div className="text-red-500">
        Error loading notes or users
      </div>
    )
  }

  const isLoading = notesLoading || usersLoading

  return (
    <div className={className}>
      {isLoading && <LoadingOverlay />}
      {!readOnly && (
        <NoteForm
          onSubmit={handleCreateNote}
          users={users || []}
          currentUserRole={userRole}
          isLoading={isCreating}
          className="mb-4"
        />
      )}
      <NoteList
        notes={notes || []}
        currentUserId={userId}
        onUpdate={!readOnly ? handleUpdateNote : undefined}
        onDelete={!readOnly ? handleDeleteNote : undefined}
        isUpdating={isUpdating}
        isDeleting={isDeleting}
      />
    </div>
  )
} 
'use client'

import { useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { NoteList } from './NoteList'
import { NoteForm } from './NoteForm'
import { UserRole } from '@/lib/types'
import type { z } from 'zod'
import type { createInternalNoteSchema } from '@/lib/validation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

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

type CreateNoteInput = z.infer<typeof createInternalNoteSchema>

export function InternalNotes({ ticketId, userId, userRole, readOnly = false, className }: InternalNotesProps) {
  const queryClient = useQueryClient()
  const supabase = createClientComponentClient<Database>()
  const isStaff = userRole === UserRole.ADMIN || userRole === UserRole.AGENT

  // Debug mount/unmount
  useEffect(() => {
    console.log('🔄 [LIFECYCLE] InternalNotes mounted', {
      ticketId,
      userId,
      userRole,
      timestamp: new Date().toISOString()
    })
    return () => {
      console.log('🔄 [LIFECYCLE] InternalNotes unmounted', {
        ticketId,
        timestamp: new Date().toISOString()
      })
    }
  }, [ticketId, userId, userRole])

  // Fetch notes for this ticket
  const { data: notes, isLoading: notesLoading, error: notesError } = useQuery({
    queryKey: ['notes', ticketId],
    queryFn: async () => {
      console.log('📥 [DATA] Fetching notes:', { ticketId })
      const response = await fetch(`/api/internal-notes?ticketId=${ticketId}`)
      if (!response.ok) throw new Error('Failed to fetch notes')
      const data = await response.json()
      console.log(`✅ [DATA] Fetched ${data?.length || 0} notes`)
      return data || []
    }
  })

  // Fetch mentionable users (admins and agents)
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async () => {
      console.log('📥 [DATA] Fetching mentionable users')
      const { data, error } = await supabase
        .from('users_secure')
        .select('*')
        .in('role', ['admin', 'agent'])

      if (error) {
        console.error('❌ [ERROR] Failed to fetch users:', error)
        throw error
      }
      console.log(`✅ [DATA] Fetched ${data?.length || 0} mentionable users:`, 
        data?.map(u => ({ id: u.id, email: u.email, role: u.role }))
      )
      return (data || []) as User[]
    },
    staleTime: 30000 // Cache for 30 seconds
  })

  // Create note mutation
  const { mutateAsync: createNote } = useMutation({
    mutationFn: async (data: CreateNoteInput) => {
      console.log('📤 [CLIENT] Creating note:', data)
      const response = await fetch('/api/internal-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [CLIENT] Create note failed:', errorData)
        throw new Error(errorData.error || 'Failed to create note')
      }
      
      const result = await response.json()
      console.log('✅ [CLIENT] Note created:', result)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticketId] })
    },
    onError: (error) => {
      console.error('❌ [CLIENT] Mutation error:', error)
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
    console.log('🎯 [ACTION] handleCreateNote called:', { content, mentions })
    await createNote({ 
      ticket_id: ticketId,
      content, 
      mentions
    })
  }, [createNote, ticketId])

  const handleUpdateNote = useCallback(async (id: string, content: string) => {
    await updateNote({ id, content })
  }, [updateNote])

  const handleDeleteNote = useCallback(async (id: string) => {
    await deleteNote(id)
  }, [deleteNote])

  if (notesError || usersError) {
    console.error('❌ [ERROR] Component error:', { notesError, usersError })
    return (
      <div className="text-red-500">
        Error loading notes or users
      </div>
    )
  }

  const isLoading = notesLoading || usersLoading
  console.log('👁️ [RENDER] InternalNotes rendering:', {
    notesCount: notes?.length,
    usersCount: users?.length,
    isLoading,
    timestamp: new Date().toISOString()
  })

  // Regular user view - no access
  if (!isStaff) {
    return null
  }

  // Staff view - show notes with tabs
  return (
    <div className={className}>
      {isLoading && <LoadingOverlay />}
      {!readOnly && (
        <NoteForm
          onSubmit={handleCreateNote}
          users={users || []}
          currentUserRole={userRole}
          isLoading={isUpdating}
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
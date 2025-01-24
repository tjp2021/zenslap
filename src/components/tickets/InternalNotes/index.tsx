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
import { useRoleAccess } from '@/hooks/useRoleAccess'

interface User {
  id: string
  email: string
  role: UserRole
}

interface InternalNotesProps {
  ticketId: string
  userId: string
  className?: string
}

type CreateNoteInput = z.infer<typeof createInternalNoteSchema>

export function InternalNotes({ ticketId, userId, className }: InternalNotesProps) {
  const queryClient = useQueryClient()
  const supabase = createClientComponentClient<Database>()
  const { isAdmin, isAgent, role } = useRoleAccess()
  const isStaff = isAdmin || isAgent

  // Debug mount/unmount
  useEffect(() => {
    console.log('🔄 [LIFECYCLE] InternalNotes mounted', {
      ticketId,
      userId,
      isStaff,
      timestamp: new Date().toISOString()
    })
    return () => {
      console.log('🔄 [LIFECYCLE] InternalNotes unmounted', {
        ticketId,
        timestamp: new Date().toISOString()
      })
    }
  }, [ticketId, userId, isStaff])

  // Return null for non-staff users
  if (!isStaff) {
    return null
  }

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

  const handleCreateNote = useCallback(async (content: string, mentions?: string[]) => {
    console.log('🎯 [ACTION] handleCreateNote called:', { content, mentions })
    await createNote({ 
      ticket_id: ticketId,
      content, 
      mentions
    })
  }, [createNote, ticketId])

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

  return (
    <div className={className}>
      {isLoading && <LoadingOverlay />}
      <NoteForm
        onSubmit={handleCreateNote}
        users={users || []}
        currentUserRole={role || UserRole.USER}
        isLoading={isLoading}
        className="mb-4"
      />
      <NoteList
        notes={notes || []}
        currentUserId={userId}
      />
    </div>
  )
} 
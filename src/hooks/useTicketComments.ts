'use client'

import { useState } from 'react'
import { Comment, CommentCreate } from '@/lib/types'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'

export function useTicketComments(ticketId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const fetchComments = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addComment = async (content: string, isInternal: boolean) => {
    setIsLoading(true)
    try {
      const newComment: CommentCreate = {
        ticket_id: ticketId,
        content,
        is_internal: isInternal,
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([newComment])
        .select()
        .single()

      if (error) throw error
      
      setComments((prev) => [data, ...prev])
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    comments,
    isLoading,
    fetchComments,
    addComment,
    deleteComment,
  }
} 
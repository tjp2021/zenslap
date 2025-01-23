'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { UserRole } from '@/lib/types'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useTicketActivities } from '@/hooks/useTicketActivities'
import { AgentAndAbove } from '@/components/auth/PermissionGate'
import { can, TicketActions } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'

interface CommentHistoryProps {
  ticketId: string
  userId: string
}

interface CommentContent {
  text: string
  is_internal: boolean
  mentions?: string[]
}

export function CommentHistory({ ticketId, userId }: CommentHistoryProps) {
  const [content, setContent] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const queryClient = useQueryClient()
  const supabase = createClientComponentClient<Database>()
  const { hasRole } = useRoleAccess()
  const { user } = useAuth()
  const { toast } = useToast()
  const isStaff = hasRole([UserRole.ADMIN, UserRole.AGENT] as UserRole[])
  const { activities: comments, isLoading, addActivity: createComment, deleteActivity: deleteComment } = useTicketActivities(ticketId)

  // Debug logging
  useEffect(() => {
    console.log('🔍 Raw Comments:', comments)
  }, [comments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      await createComment(content.trim(), isStaff && isInternalNote)
      setContent('')
      setIsInternalNote(false)
      toast({
        title: 'Success',
        description: isInternalNote ? 'Internal note added' : 'Comment added',
      })
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId)
      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete comment. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Remove client-side filtering - we're handling this in the query
  const visibleComments = comments

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Comment History</h3>
      
      {/* Comment Input Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-4">
          {/* Debug render */}
          <div className="text-xs text-gray-500">
            Debug: isStaff={String(isStaff)}, hasRole={String(!!hasRole)}
          </div>
          
          {/* Internal Note Switch - Only visible to staff */}
          {isStaff ? (
            <div className="flex items-center gap-2">
              <Switch
                id="internal-note"
                checked={isInternalNote}
                onCheckedChange={setIsInternalNote}
              />
              <Label htmlFor="internal-note" className="text-sm font-medium">
                Internal Note (only visible to staff)
              </Label>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Debug: Internal note switch hidden because isStaff is false
            </div>
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isStaff && isInternalNote ? "Add an internal note..." : "Add a comment..."}
            className="min-h-[100px]"
          />
          
          <Button 
            type="submit" 
            disabled={!content.trim()}
            className="w-full"
          >
            {isInternalNote ? 'Add Internal Note' : 'Add Comment'}
          </Button>
        </div>
      </form>

      {/* Comments Display */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading comments...</p>
        ) : visibleComments?.length ? (
          visibleComments.map((comment) => {
            // Parse the content properly - content only has the text
            const content = typeof comment.content === 'string' 
              ? JSON.parse(comment.content) 
              : comment.content
            
            // Debug the actual data structure
            console.log('🔍 Comment Structure:', {
              id: comment.id,
              is_internal: comment.is_internal, // THIS is where it actually is
              content
            })
            
            const userEmail = comment.actor?.email || 'Unknown User'
            // Use the root level is_internal flag
            const isInternal = comment.is_internal
            
            return (
              <div
                key={comment.id}
                className={cn(
                  "p-4 rounded-lg border",
                  isInternal
                    ? "bg-yellow-50 border-yellow-200" 
                    : "bg-white border-gray-100"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{userEmail}</span>
                    {isInternal && (
                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                        Internal Note
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{content.text}</p>
                {/* Show mentions only if they exist and user is staff */}
                {isStaff && content.mentions && content.mentions.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {content.mentions.map((mention: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        @{mention}
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Show delete button only if user has permission */}
                {comment.actor_id === user?.id && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-center text-gray-500">No comments yet</p>
        )}
      </div>
    </Card>
  )
} 
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Comment } from '@/lib/types'
import { useAuth } from '@/lib/hooks/useAuth'
import { can, TicketActions } from '@/lib/permissions'
import { AgentAndAbove } from '@/components/auth/PermissionGate'
import { formatDistanceToNow } from 'date-fns'

interface CommentsProps {
  ticketId: string
  comments: Comment[]
  onAddComment: (content: string, isInternal: boolean) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  isLoading?: boolean
}

export function Comments({ 
  ticketId, 
  comments, 
  onAddComment,
  onDeleteComment,
  isLoading = false 
}: CommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await onAddComment(newComment.trim(), isInternal)
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          disabled={isLoading}
        />
        <div className="flex items-center justify-between">
          <AgentAndAbove>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="form-checkbox"
              />
              <span>Internal Note</span>
            </label>
          </AgentAndAbove>
          <Button type="submit" disabled={isLoading || !newComment.trim()}>
            {isLoading ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div 
            key={comment.id} 
            className={`p-4 rounded-lg ${
              comment.is_internal ? 'bg-yellow-50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{comment.created_by}</span>
                  <span className="text-gray-500 text-sm">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {comment.is_internal && (
                    <span className="text-yellow-600 text-sm font-medium">
                      Internal Note
                    </span>
                  )}
                </div>
                <p className="mt-1">{comment.content}</p>
              </div>
              {can(TicketActions.DELETE_COMMENT, user, { created_by: comment.created_by }) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteComment(comment.id)}
                  className="text-gray-500 hover:text-red-600"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 
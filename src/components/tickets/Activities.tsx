'use client'

import React, { useState } from 'react'
import { ACTIVITY_TYPES, ActivityType, TicketActivity, CommentContent, StatusChangeContent, AssignmentContent, FieldChangeContent, Actor } from '@/lib/types/activities'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Tag, User, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ActivitiesProps {
  ticketId: string
  activities: TicketActivity[]
  onAddActivity: (content: string, isInternal: boolean) => Promise<void>
  onDeleteActivity: (activityId: string) => Promise<void>
  isLoading?: boolean
}

export function Activities({ ticketId, activities, onAddActivity, onDeleteActivity, isLoading }: ActivitiesProps) {
  const { user } = useAuth()
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await onAddActivity(newComment, isInternal)
      setNewComment('')
      setIsInternal(false)
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleDelete = async (activityId: string) => {
    try {
      await onDeleteActivity(activityId)
      toast.success('Comment deleted')
    } catch (error) {
      toast.error('Failed to delete comment')
    }
  }

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case ACTIVITY_TYPES.COMMENT:
        return <MessageSquare className="h-4 w-4" />
      case ACTIVITY_TYPES.STATUS_CHANGE:
        return <Tag className="h-4 w-4" />
      case ACTIVITY_TYPES.ASSIGNMENT:
        return <User className="h-4 w-4" />
      case ACTIVITY_TYPES.FIELD_CHANGE:
        return <Tag className="h-4 w-4" />
      default:
        return null
    }
  }

  const renderActivity = (activity: TicketActivity) => {
    const actorName = activity.actor?.email || activity.actor_id
    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
    
    switch (activity.activity_type) {
      case ACTIVITY_TYPES.COMMENT:
        const commentContent = activity.content as CommentContent
        return (
          <div className={`p-4 rounded-lg ${commentContent.is_internal ? 'bg-yellow-50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{actorName}</span>
                {commentContent.is_internal && (
                  <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded">Internal Note</span>
                )}
              </div>
              {user?.id === activity.actor_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(activity.id)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-gray-700">{commentContent.text}</p>
            <span className="text-sm text-gray-500 mt-2">{timeAgo}</span>
          </div>
        )

      case ACTIVITY_TYPES.STATUS_CHANGE:
        const statusContent = activity.content as StatusChangeContent
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Tag className="h-4 w-4" />
            <span>{actorName} changed status from {statusContent.from} to {statusContent.to}</span>
            <span>{timeAgo}</span>
          </div>
        )

      case ACTIVITY_TYPES.ASSIGNMENT:
        const assignContent = activity.content as AssignmentContent
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="h-4 w-4" />
            <span>
              {actorName} {assignContent.from ? 'reassigned' : 'assigned'} ticket to {assignContent.to || 'no one'}
            </span>
            <span>{timeAgo}</span>
          </div>
        )

      case ACTIVITY_TYPES.FIELD_CHANGE:
        const fieldContent = activity.content as FieldChangeContent
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Tag className="h-4 w-4" />
            <span>
              {actorName} updated {fieldContent.field} from {fieldContent.from} to {fieldContent.to}
            </span>
            <span>{timeAgo}</span>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[100px]"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Internal Note</span>
          </label>
          <Button type="submit" disabled={!newComment.trim()}>
            Add Comment
          </Button>
        </div>
      </form>

      <Separator />

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id}>
            {renderActivity(activity)}
          </div>
        ))}
      </div>
    </div>
  )
} 
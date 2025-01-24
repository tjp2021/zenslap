'use client'

import { useState, useEffect, useRef } from 'react'
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
import { useMentions } from '@/hooks/useMentions'
import { MentionList } from '@/components/mentions/MentionList'
import { MentionData } from '@/lib/types/activities'
import { useStaffUsers } from '@/hooks/useStaffUsers'

interface CommentHistoryProps {
  ticketId: string
  userId: string
}

interface CommentContent {
  text: string
  is_internal: boolean
  mentions?: MentionData[]
  raw_content?: string
  parsed_content?: string
}

export function CommentHistory({ ticketId, userId }: CommentHistoryProps) {
  const [content, setContent] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [currentMentions, setCurrentMentions] = useState<MentionData[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()
  const supabase = createClientComponentClient<Database>()
  const { hasRole } = useRoleAccess()
  const { user } = useAuth()
  const { toast } = useToast()
  const isStaff = hasRole([UserRole.ADMIN, UserRole.AGENT] as UserRole[])
  const { activities: comments, isLoading, addActivity: createComment, deleteActivity: deleteComment } = useTicketActivities(ticketId)
  const { users: staffUsers } = useStaffUsers()

  // Initialize mention handling
  const {
    isActive: showMentions,
    suggestions,
    selectedIndex,
    isLoading: loadingMentions,
    handlers: mentionHandlers
  } = useMentions({
    onMention: (mention) => {
      if (!textareaRef.current) return

      const textarea = textareaRef.current
      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = content.slice(0, cursorPosition)
      const textAfterCursor = content.slice(cursorPosition)
      
      // Find the @ symbol we're currently handling
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@')
      if (lastAtSymbol === -1) return

      // Use email for a cleaner display
      const selectedUser = suggestions[selectedIndex]
      const replacementText = `@${selectedUser.email} `
      
      // Combine it all
      const newContent = textBeforeCursor.slice(0, lastAtSymbol) + 
                        replacementText + 
                        textAfterCursor

      // Update content and mentions
      setContent(newContent)
      setCurrentMentions(prev => [...prev, mention])
      
      // Move cursor to end of inserted mention
      const newCursorPosition = lastAtSymbol + replacementText.length
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(newCursorPosition, newCursorPosition)
      }, 0)
    }
  })

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    mentionHandlers.onInput(newContent, e.target.selectionStart || 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      await createComment(content.trim(), isStaff && isInternalNote, currentMentions)
      setContent('')
      setIsInternalNote(false)
      setCurrentMentions([])
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

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={mentionHandlers.onKeyDown}
              placeholder={isStaff && isInternalNote ? "Add an internal note..." : "Add a comment..."}
              className="min-h-[100px]"
              aria-expanded={showMentions}
              aria-haspopup="listbox"
              aria-controls={showMentions ? 'mention-suggestions' : undefined}
            />
            
            {/* Mention suggestions */}
            {showMentions && (
              <div className="absolute bottom-full left-0 w-full mb-1">
                <MentionList
                  suggestions={suggestions}
                  isLoading={loadingMentions}
                  selectedIndex={selectedIndex}
                  onSelect={mentionHandlers.onSelect}
                  className="border shadow-lg"
                />
              </div>
            )}
          </div>
          
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
                
                {/* Comment content and mentions */}
                <div className="space-y-2">
                  {/* Main text content - without @mentions */}
                  {content.text && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {content.text.replace(/@[^\s]+\s*/g, '')}
                    </p>
                  )}

                  {/* Show mentions only as badges */}
                  {isStaff && content.mentions && content.mentions.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {content.mentions.map((mention: MentionData) => {
                        const mentionedUser = staffUsers.find(u => u.id === mention.referenced_id)
                        if (!mentionedUser) return null
                        return (
                          <Badge 
                            key={mention.id} 
                            variant="secondary" 
                            className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            @{mentionedUser.email}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>

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
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
import { InlineQuickResponseSelector } from '@/components/quick-responses/InlineQuickResponseSelector'

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

  // Filter comments based on user role
  const visibleComments = useMemo(() => {
    if (!comments) return []
    // Staff can see everything
    if (isStaff) return comments
    // Regular users can only see non-internal comments
    return comments.filter(comment => !comment.is_internal)
  }, [comments, isStaff])

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

  const handleQuickResponseSelect = (responseContent: string) => {
    setContent(prevContent => {
      const textarea = textareaRef.current
      if (!textarea) return prevContent

      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      return prevContent.slice(0, start) + responseContent + prevContent.slice(end)
    })
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Comment History</h3>
      
      {/* Comment Input Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-4">
          {/* Internal Note Switch - Only visible to staff */}
          {isStaff && (
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
          
          <div className="flex gap-2">
            {isStaff && (
              <InlineQuickResponseSelector 
                onSelect={handleQuickResponseSelect} 
                ticketData={{
                  ticket_id: ticketId,
                  agent_name: user?.email
                }}
              />
            )}
            <Button 
              type="submit" 
              disabled={!content.trim()}
              className="flex-1"
            >
              {isInternalNote ? 'Add Internal Note' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </form>

      {/* Comments Display */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading comments...</p>
        ) : visibleComments?.length ? (
          visibleComments.map(comment => {
            const content = typeof comment.content === 'string' 
              ? JSON.parse(comment.content) 
              : comment.content
            
            const userEmail = comment.actor?.email || 'Unknown User'
            const isInternal = comment.is_internal
            
            return (
              <div
                key={comment.id}
                className={cn(
                  "p-4 rounded-lg border",
                  isInternal && "bg-muted border-muted-foreground/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{userEmail}</span>
                    {isInternal && (
                      <Badge variant="outline" className="text-xs">
                        Internal
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {(isStaff || comment.actor_id === user?.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                        className="h-6 px-2"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap">{content.text}</p>
              </div>
            )
          })
        ) : (
          <p className="text-center text-muted-foreground">No comments yet</p>
        )}
      </div>
    </Card>
  )
} 
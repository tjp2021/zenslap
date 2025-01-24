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

  // Add function to format comment content with mentions
  const formatCommentContent = (content: CommentContent) => {
    if (!content.mentions?.length) return content.text

    // Create a map of user IDs to user data
    const userMap = staffUsers?.reduce((acc, user) => ({
      ...acc,
      [user.id]: {
        id: user.id,
        email: user.email || '',  // Provide default empty string
        role: user.role
      }
    }), {} as Record<string, { id: string; email: string; role: UserRole }>) || {}

    return content.text.replace(
      /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g,
      (match, email) => {
        const user = Object.values(userMap).find(u => u.email === email)
        if (!user) return match
        return `<span class="mention bg-blue-100 dark:bg-blue-900 rounded px-1">${match}</span>`
      }
    )
  }

  // Filter comments based on user role
  const visibleComments = useMemo(() => {
    if (!comments) return []
    
    console.log('🔍 [CommentHistory] Filtering comments:', {
      totalComments: comments.length,
      isStaff,
      timestamp: new Date().toISOString()
    })
    
    // Staff can see everything
    if (isStaff) return comments
    
    // Regular users can only see non-internal comments
    const filtered = comments.filter(comment => {
      if (comment.activity_type !== 'comment') return true
      const content = comment.content as CommentContent
      return !content.is_internal
    })
    
    console.log('🔍 [CommentHistory] After filtering:', {
      originalCount: comments.length,
      filteredCount: filtered.length,
      removedCount: comments.length - filtered.length,
      firstFewFiltered: filtered.slice(0, 2).map(c => ({
        id: c.id,
        type: c.activity_type,
        isInternal: c.activity_type === 'comment' ? (c.content as CommentContent).is_internal : false
      }))
    })
    
    return filtered
  }, [comments, isStaff])

  // Initialize mention handling
  const {
    isActive: showMentions,
    users: suggestions,
    isLoading: loadingMentions,
    setQuery: handleMentionSearch,
    setActive: setMentionsActive,
    handleSelect: onMentionSelect
  } = useMentions({
    onSelect: (user) => {
      if (!textareaRef.current) return

      const textarea = textareaRef.current
      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = content.slice(0, cursorPosition)
      const textAfterCursor = content.slice(cursorPosition)
      
      // Find the @ symbol we're currently handling
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@')
      if (lastAtSymbol === -1) return

      // Use email for a cleaner display
      const replacementText = `@${user.email} `
      
      // Combine it all
      const newContent = textBeforeCursor.slice(0, lastAtSymbol) + 
                        replacementText + 
                        textAfterCursor

      // Update content and mentions
      setContent(newContent)
      setCurrentMentions(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'user',
        referenced_id: user.id
      }])
      
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
    
    // Handle mentions
    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = newContent.slice(0, cursorPosition)
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1)
      if (!textAfterAt.includes(' ')) {
        setMentionsActive(true)
        handleMentionSearch(textAfterAt)
        return
      }
    }
    
    setMentionsActive(false)
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
                  onSelect={onMentionSelect}
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
              : comment.content as CommentContent
            
            const isInternal = comment.activity_type === 'comment' && content.is_internal
            
            return (
              <div
                key={comment.id}
                className={cn(
                  "p-4 rounded-lg",
                  isInternal ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-gray-50 dark:bg-gray-900/20"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{comment.actor?.email}</span>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {isInternal && (
                        <Badge variant="secondary" className="ml-2">Internal Note</Badge>
                      )}
                    </div>
                    <div 
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: formatCommentContent(content)
                      }}
                    />
                  </div>
                  {user && can(TicketActions.DELETE_COMMENT, user, comment as any) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  )}
                </div>
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
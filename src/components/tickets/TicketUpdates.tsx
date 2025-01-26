'use client'

import { useTicketUpdates } from '@/hooks/useTicketUpdates'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { Tag, MessageSquare, AlertCircle, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface DatabaseActivity {
  id: string
  activity_type: 'comment' | 'status_change' | 'priority_change' | 'assignment'
  content: {
    text?: string
    message?: string
    from?: string
    to?: string
    is_internal?: boolean
  }
  created_at: string
  ticket: {
    id: string
    title: string
    created_by: string
  }
  actor: {
    id: string
    email: string
    role: string
  }
}

const ITEMS_PER_PAGE = 8

// Helper function to format ticket ID display
const formatTicketId = (ticket: DatabaseActivity['ticket']) => {
  if (!ticket?.id) return 'Unknown Ticket'
  return `Ticket #${ticket.id.slice(0, 8)}`
}

// Helper function to format user display
const formatUserDisplay = (email: string) => {
  if (!email) return 'Unknown User'
  return email.split('@')[0]
}

export function TicketUpdates() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, isAgent } = useRoleAccess()
  const isStaff = isAdmin || isAgent
  const { activities, isLoading: updatesLoading, error } = useTicketUpdates()
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate pagination values
  const totalPages = useMemo(() => {
    if (!activities) return 0
    return Math.ceil(activities.length / ITEMS_PER_PAGE)
  }, [activities])

  // Get current page's activities
  const currentActivities = useMemo(() => {
    if (!activities) return []
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return activities.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [activities, currentPage])

  // Navigation handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  // Show loading state while auth is loading
  if (authLoading || !user) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 border rounded-lg">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (updatesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 border rounded-lg">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 p-4">
        Failed to load updates
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        {isStaff ? 'No updates on your assigned tickets' : 'No updates on your tickets'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Activities List */}
      <div className="space-y-3">
        {(currentActivities as DatabaseActivity[]).map((activity) => {
          // Skip internal comments for non-staff users
          if (activity.content.is_internal && !isStaff) {
            return null
          }

          // Skip priority changes for non-staff users
          if (activity.activity_type === 'priority_change' && !isStaff) {
            return null
          }

          // Skip assignment changes for non-staff users
          if (activity.activity_type === 'assignment' && !isStaff) {
            return null
          }
          
          return (
            <div 
              key={activity.id} 
              className={cn(
                "p-4 border rounded-lg hover:bg-muted/50 transition-colors",
                activity.content.is_internal && "bg-yellow-50/50"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Activity Icon with Background */}
                <div className={cn(
                  "p-2 rounded-full",
                  activity.activity_type === 'comment' && activity.content.is_internal ? "bg-yellow-50" : "bg-blue-50",
                  activity.activity_type === 'status_change' && "bg-yellow-50",
                  activity.activity_type === 'priority_change' && "bg-red-50",
                  activity.activity_type === 'assignment' && "bg-purple-50"
                )}>
                  {activity.activity_type === 'comment' && (
                    <MessageSquare className={cn(
                      "h-4 w-4",
                      activity.content.is_internal ? "text-yellow-500" : "text-blue-500"
                    )} />
                  )}
                  {activity.activity_type === 'status_change' && (
                    <ArrowRightLeft className="h-4 w-4 text-yellow-500" />
                  )}
                  {activity.activity_type === 'priority_change' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {activity.activity_type === 'assignment' && (
                    <Tag className="h-4 w-4 text-purple-500" />
                  )}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  {/* Header - Show ticket number and internal badge if applicable */}
                  <h3 className="font-medium text-sm mb-1 flex items-center gap-2">
                    {formatTicketId(activity.ticket)}
                    {activity.content.is_internal && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Internal
                      </span>
                    )}
                  </h3>

                  {/* Activity Description */}
                  <p className="text-sm text-muted-foreground">
                    {activity.activity_type === 'comment' && (
                      <>Comment by <span className="font-medium">{formatUserDisplay(activity.actor.email)}</span></>
                    )}
                    {activity.activity_type === 'status_change' && (
                      <span className="capitalize">
                        Status changed from <span className="font-medium">{activity.content.from}</span> to <span className="font-medium">{activity.content.to}</span>
                      </span>
                    )}
                    {activity.activity_type === 'priority_change' && isStaff && (
                      <span className="capitalize">
                        Priority changed from <span className="font-medium">{activity.content.from}</span> to <span className="font-medium">{activity.content.to}</span>
                      </span>
                    )}
                    {activity.activity_type === 'assignment' && isStaff && (
                      <>
                        {activity.content.to ? (
                          <>Assigned to <span className="font-medium">{formatUserDisplay(activity.content.to)}</span></>
                        ) : (
                          <>Unassigned</>
                        )}
                      </>
                    )}
                  </p>

                  {/* Comment Preview */}
                  {activity.activity_type === 'comment' && 
                   activity.content.text && (
                    <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md line-clamp-2">
                      {activity.content.text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }).filter(Boolean)}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={cn(
              "flex items-center gap-2",
              currentPage === 1 && "opacity-50 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={cn(
              "flex items-center gap-2",
              currentPage === totalPages && "opacity-50 cursor-not-allowed"
            )}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
} 
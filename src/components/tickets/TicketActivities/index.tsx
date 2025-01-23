'use client'

import { useRoleAccess } from '@/hooks/useRoleAccess'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { CustomerComments } from './CustomerComments'
import { StaffCommunications } from './StaffCommunications'
import { ActivityFeed } from './ActivityFeed'

interface TicketActivitiesProps {
  ticketId: string
  userId: string
  className?: string
}

export function TicketActivities({ ticketId, userId, className }: TicketActivitiesProps) {
  const { isAdmin, isAgent, isLoading } = useRoleAccess()
  const isStaff = isAdmin || isAgent

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>
  }

  // Regular user view - only show comments
  if (!isStaff) {
    return (
      <div className={className}>
        <CustomerComments 
          ticketId={ticketId} 
          userId={userId} 
        />
      </div>
    )
  }

  // Staff view - show tabs with all features
  return (
    <Tabs defaultValue="communications" className={cn('w-full', className)}>
      <TabsList>
        <TabsTrigger value="communications">Communications</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
      </TabsList>

      <TabsContent value="communications" className="mt-4">
        <StaffCommunications 
          ticketId={ticketId}
          userId={userId}
        />
      </TabsContent>

      <TabsContent value="activities" className="mt-4">
        <ActivityFeed 
          ticketId={ticketId}
        />
      </TabsContent>
    </Tabs>
  )
} 
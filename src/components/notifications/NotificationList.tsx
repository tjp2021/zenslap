import { useNotifications } from '@/lib/hooks/useNotifications'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NotificationListProps {
  onClose: () => void
}

export function NotificationList({ onClose }: NotificationListProps) {
  const { notifications, isLoading, markAllAsRead, markAsRead } = useNotifications()

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Card>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-500">No notifications</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-medium">Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await markAllAsRead()
              onClose()
            } catch (error) {
              console.error('Failed to mark all as read:', error)
            }
          }}
        >
          Mark all as read
        </Button>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.map((notification) => (
          <Link
            key={notification.id}
            href={`/tickets/${notification.activity.ticket_id}`}
            className={cn(
              "block border-b p-4 transition-colors hover:bg-gray-50",
              notification.priority === 'high' && 'bg-red-50 hover:bg-red-100'
            )}
            onClick={async (e) => {
              e.preventDefault() // Prevent navigation until we mark as read
              await markAsRead(notification.id)
              onClose()
              window.location.href = `/tickets/${notification.activity.ticket_id}`
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  {notification.priority === 'high' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <p className="text-sm">
                    <span className="font-medium">
                      {notification.activity.ticket.title}
                    </span>
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {notification.activity.content.text}
                </p>
                {notification.ai_metadata && (
                  <div className="mt-2 text-xs">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Info className="h-3 w-3" />
                      <span>{notification.ai_metadata.reasoning}</span>
                    </div>
                    {notification.ai_metadata.suggestedActions && notification.ai_metadata.suggestedActions.length > 0 && (
                      <div className="mt-1">
                        <span className="font-medium text-gray-700">Suggested actions: </span>
                        <span className="text-gray-500">
                          {notification.ai_metadata.suggestedActions.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              {notification.priority && (
                <div className={cn(
                  "rounded px-2 py-1 text-xs font-medium",
                  notification.priority === 'high' && 'bg-red-100 text-red-800',
                  notification.priority === 'medium' && 'bg-yellow-100 text-yellow-800',
                  notification.priority === 'low' && 'bg-green-100 text-green-800'
                )}>
                  {notification.priority}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
} 
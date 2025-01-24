import { useNotifications } from '@/lib/hooks/useNotifications'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

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
          onClick={() => {
            markAllAsRead()
            onClose()
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
            className="block border-b p-4 transition-colors hover:bg-gray-50"
            onClick={() => {
              markAsRead(notification.id)
              onClose()
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm">
                  <span className="font-medium">
                    {notification.activity.ticket.title}
                  </span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notification.activity.content.text}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
} 
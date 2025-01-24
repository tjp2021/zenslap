import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { NotificationList } from './NotificationList'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount } = useNotifications()

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80">
          <NotificationList onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  )
} 
import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { NotificationList } from './NotificationList'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, highPriorityCount } = useNotifications()
  const containerRef = useRef<HTMLDivElement>(null)

  // Show indicator if there are any unread notifications
  const hasUnread = notifications.length > 0
  const hasHighPriority = highPriorityCount > 0

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative",
          hasHighPriority && "text-red-500 hover:text-red-600",
          hasUnread && !hasHighPriority && "text-blue-500 hover:text-blue-600"
        )}
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white",
            hasHighPriority ? "bg-red-500" : "bg-blue-500",
            hasHighPriority && "animate-pulse"
          )} />
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
import { Badge } from "@/components/ui/badge"
import { Ticket } from "@/lib/types"
import { QueueManager } from "@/lib/services/QueueManager"
import { Clock } from 'lucide-react'

interface SLAIndicatorProps {
  ticket: Ticket
}

export function SLAIndicator({ ticket }: SLAIndicatorProps) {
  const queueManager = new QueueManager()
  const deadline = queueManager.getSLADeadline(ticket)
  const now = new Date()
  const timeLeft = deadline.getTime() - now.getTime()
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
  const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)))

  const isViolated = ticket.metadata?.sla_violated || timeLeft <= 0
  const isWarning = !isViolated && timeLeft <= 30 * 60 * 1000 // 30 minutes

  return (
    <div className="flex items-center gap-2">
      <Clock 
        data-testid="clock-icon"
        className={`h-4 w-4 ${
          isViolated ? 'text-red-500' :
          isWarning ? 'text-yellow-500' :
          'text-green-500'
        }`} 
      />
      
      <Badge variant={
        isViolated ? "destructive" :
        isWarning ? "secondary" :
        "default"
      }>
        {isViolated ? (
          'SLA Violated'
        ) : (
          `${hoursLeft}h ${minutesLeft}m`
        )}
      </Badge>
    </div>
  )
} 
'use client'

import { Card, CardContent } from "@/components/ui/card"
import { useTicketStatistics } from "@/hooks/useTicketStatistics"
import { Skeleton } from "@/components/ui/skeleton"

export function TicketStatistics() {
  const { statistics, isLoading: loading, isError: error } = useTicketStatistics()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2">Ticket Statistics (this week)</h3>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-4 bg-[#f8faf6] rounded-lg">
                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2">Ticket Statistics (this week)</h3>
          <div className="text-red-500 text-center">Failed to load statistics</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-2">Ticket Statistics (this week)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
            <div className="text-2xl font-bold text-[#2d6847]">{statistics.good}</div>
            <div className="text-sm text-muted-foreground">GOOD</div>
          </div>
          <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
            <div className="text-2xl font-bold text-[#2d6847]">{statistics.bad}</div>
            <div className="text-sm text-muted-foreground">BAD</div>
          </div>
          <div className="text-center p-4 bg-[#f8faf6] rounded-lg">
            <div className="text-2xl font-bold text-[#2d6847]">{statistics.solved}</div>
            <div className="text-sm text-muted-foreground">SOLVED</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 
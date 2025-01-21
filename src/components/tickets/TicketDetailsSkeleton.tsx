'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function TicketDetailsSkeleton() {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-x-2">
          <Button variant="outline" disabled>Back</Button>
          <Button disabled>Edit</Button>
          <Button variant="destructive" disabled>Delete</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
} 
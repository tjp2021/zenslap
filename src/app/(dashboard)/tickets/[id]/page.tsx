import { Suspense } from 'react'
import { TicketDetailsClient } from './TicketDetailsClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailsPage({ params }: PageProps) {
  // Await params since it's Promise-based in Next.js 14
  const { id } = await params
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TicketDetailsClient id={id} />
    </Suspense>
  )
} 
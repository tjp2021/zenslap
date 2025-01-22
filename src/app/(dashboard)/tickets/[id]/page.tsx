import { Suspense } from 'react'
import TicketDetailsClient from './TicketDetailsClient'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailsPage({ params }: PageProps) {
  const resolvedParams = await params
  
  if (!resolvedParams.id) {
    notFound()
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TicketDetailsClient id={resolvedParams.id} />
    </Suspense>
  )
} 
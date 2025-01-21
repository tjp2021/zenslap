import { TicketsProvider } from '@/lib/context/tickets'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TicketsProvider>
      <div className="min-h-screen bg-gray-100">
        {children}
      </div>
    </TicketsProvider>
  )
} 
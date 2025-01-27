'use client'

import { AdminOnly } from '@/components/auth/PermissionGate'
import { TopNav } from '@/components/navigation/TopNav'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminOnly>
      <div className="min-h-screen bg-gray-100">
        <TopNav />
        <div className="flex">
          {/* Settings Sidebar */}
          <aside className="w-64 min-h-screen bg-white border-r">
            <nav className="p-4 space-y-2">
              <h2 className="font-semibold mb-4 text-sm text-muted-foreground">Settings</h2>
              <div className="space-y-1">
                <a 
                  href="/settings/sla" 
                  className="block px-2 py-1 text-sm rounded hover:bg-accent"
                >
                  SLA Policies
                </a>
              </div>
            </nav>
          </aside>
          {/* Settings Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminOnly>
  )
} 
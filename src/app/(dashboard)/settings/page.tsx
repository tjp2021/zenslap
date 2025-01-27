import { AdminOnly } from '@/components/auth/PermissionGate'
import { SettingsClient } from './SettingsClient'

export default function SettingsPage() {
  return (
    <AdminOnly>
      <SettingsClient />
    </AdminOnly>
  )
} 
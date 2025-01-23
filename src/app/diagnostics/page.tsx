import { StaffUsersDiagnostic } from '@/components/diagnostics/StaffUsersDiagnostic'

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">System Diagnostics</h1>
      <StaffUsersDiagnostic />
    </div>
  )
} 
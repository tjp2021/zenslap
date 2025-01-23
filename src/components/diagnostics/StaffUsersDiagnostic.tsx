'use client'

import { useEffect, useState } from 'react'
import { diagnoseStaffUsers } from '@/lib/diagnostics/staff-users'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DiagnosticResult {
  step: string
  success: boolean
  data?: any
  error?: any
}

export function StaffUsersDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runDiagnostics = async () => {
      const diagnosticResults = await diagnoseStaffUsers()
      setResults(diagnosticResults)
      setLoading(false)
    }

    runDiagnostics()
  }, [])

  if (loading) {
    return <div>Running diagnostics...</div>
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Staff Users Diagnostic Results</h2>
      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{result.step}</h3>
              <Badge
                variant={result.success ? 'default' : 'destructive'}
              >
                {result.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            {result.data && (
              <pre className="bg-muted p-2 rounded text-xs mt-2 overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
            {result.error && (
              <div className="mt-2 text-sm text-destructive">
                Error: {result.error.message || JSON.stringify(result.error)}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
} 
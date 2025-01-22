import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Unauthorized Access',
  description: 'You do not have permission to access this resource'
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 py-8 bg-card rounded-lg shadow-lg">
        <div className="flex flex-col items-center space-y-6 text-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <ShieldAlert className="w-12 h-12 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              You don't have permission to access this resource. Please contact your administrator if you believe this is a mistake.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="default">
              <Link href="/tickets">
                Return to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login">
                Sign in with Different Account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 
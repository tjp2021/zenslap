'use client'

import { Component, type ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

const isPermissionError = (error: any): boolean => {
  return (
    error?.message?.includes('permission') ||
    error?.message?.includes('unauthorized') ||
    error?.message?.includes('forbidden') ||
    error?.status === 403 ||
    error?.status === 401
  )
}

export class RoleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error): void {
    // Log to error reporting service
    console.error('Role Error Boundary caught an error:', error)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    const { hasError, error } = this.state
    const { children, fallback } = this.props

    if (!hasError) return children

    // If it's a permission error and no custom fallback is provided
    if (isPermissionError(error) && !fallback) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="max-w-md w-full px-6 py-8 bg-card rounded-lg shadow-lg">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="p-3 bg-destructive/10 rounded-full">
                <ShieldAlert className="w-12 h-12 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Permission Error
                </h2>
                <p className="text-muted-foreground">
                  You don't have permission to perform this action.
                </p>
              </div>

              <Button onClick={this.handleReset} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    // Use custom fallback if provided
    if (fallback) return fallback

    // Default error UI for non-permission errors
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="max-w-md w-full px-6 py-8">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <Button onClick={this.handleReset} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }
} 
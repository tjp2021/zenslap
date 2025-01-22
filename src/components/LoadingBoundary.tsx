interface LoadingBoundaryProps {
  loading: boolean
  error?: Error | null
  children: React.ReactNode
  loadingFallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

export function LoadingBoundary({
  loading,
  error,
  children,
  loadingFallback,
  errorFallback
}: LoadingBoundaryProps) {
  if (loading) {
    return loadingFallback || <div>Loading...</div>
  }

  if (error) {
    return errorFallback || (
      <div className="p-4 bg-red-50 text-red-700 rounded">
        {error.message}
      </div>
    )
  }

  return children
} 
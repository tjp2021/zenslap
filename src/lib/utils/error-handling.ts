import { PostgrestError } from '@supabase/supabase-js'

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleError(
  error: unknown,
  operation: string,
  context: Record<string, unknown> = {}
): ApiResponse<never> {
  // Log error with context
  console.error(`Error during ${operation}:`, {
    error,
    context,
    timestamp: new Date().toISOString(),
    ...(error instanceof Error && {
      name: error.name,
      message: error.message,
      stack: error.stack
    }),
    ...(error instanceof PostgrestError && {
      code: error.code,
      details: error.details,
      hint: error.hint
    })
  })

  // Convert to ApiError if not already
  const apiError = error instanceof ApiError
    ? error
    : error instanceof PostgrestError
    ? new ApiError(error.message, error.code, error.details)
    : error instanceof Error
    ? new ApiError(error.message)
    : new ApiError('An unexpected error occurred')

  return {
    data: null,
    error: apiError.message
  }
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null
  }
} 
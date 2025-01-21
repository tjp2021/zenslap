import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    className?: string
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
    return (
        <div className={cn('flex justify-center items-center p-4', className)}>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="sr-only">Loading...</span>
        </div>
    )
} 
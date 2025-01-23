import * as React from 'react'
import { cn } from '@/lib/utils'

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Command({ className, children, ...props }: CommandProps) {
    return (
        <div
            className={cn(
                'rounded-lg border bg-popover text-popover-foreground shadow-md',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
} 
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface NoteFormProps {
    onSubmit: (content: string) => Promise<void>
    isLoading?: boolean
    className?: string
}

export function NoteForm({ onSubmit, isLoading, className }: NoteFormProps) {
    const [content, setContent] = useState('')

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || isLoading) return

        try {
            await onSubmit(content)
            setContent('')
        } catch (error) {
            // Error is handled by parent component
        }
    }, [content, isLoading, onSubmit])

    return (
        <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
            <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Add an internal note..."
                className="min-h-[100px]"
                disabled={isLoading}
            />
            <Button
                type="submit"
                disabled={!content.trim() || isLoading}
                className="w-full"
            >
                {isLoading ? 'Adding...' : 'Add Note'}
            </Button>
        </form>
    )
} 
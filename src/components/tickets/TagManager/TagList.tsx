import { useCallback } from 'react'
import { Tag } from '@/lib/types'
import { Badge, Button } from '@/components/ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagListProps {
    tags: Tag[]
    selectedTags: Tag[]
    onDelete?: (id: string) => Promise<void>
    onChange?: (tags: Tag[]) => void
    isDeleting?: boolean
    className?: string
}

export function TagList({ 
    tags, 
    selectedTags, 
    onDelete, 
    onChange,
    isDeleting,
    className 
}: TagListProps) {
    const handleTagClick = useCallback((tag: Tag) => {
        if (!onChange) return

        const isSelected = selectedTags.some(t => t.id === tag.id)
        if (isSelected) {
            onChange(selectedTags.filter(t => t.id !== tag.id))
        } else {
            onChange([...selectedTags, tag])
        }
    }, [selectedTags, onChange])

    const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (isDeleting) return
        onDelete?.(id)
    }, [onDelete, isDeleting])

    if (!tags.length) {
        return (
            <p className={cn('text-sm text-muted-foreground text-center py-4', className)}>
                No tags available
            </p>
        )
    }

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {tags.map(tag => {
                const isSelected = selectedTags.some(t => t.id === tag.id)
                return (
                    <Badge
                        key={tag.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={cn(
                            'cursor-pointer select-none transition-colors',
                            onChange && 'hover:bg-primary/90',
                            tag.color && `bg-[${tag.color}]`
                        )}
                        onClick={() => handleTagClick(tag)}
                    >
                        {tag.name}
                        {onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    'h-4 w-4 p-0 ml-1 hover:bg-destructive/20',
                                    isDeleting && 'opacity-50 cursor-not-allowed'
                                )}
                                onClick={(e) => handleDelete(e, tag.id)}
                                disabled={isDeleting}
                            >
                                <X className="h-3 w-3" />
                                <span className="sr-only">Delete tag</span>
                            </Button>
                        )}
                    </Badge>
                )
            })}
        </div>
    )
} 
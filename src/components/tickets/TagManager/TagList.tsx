import { useCallback } from 'react'
import { Tag } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagListProps {
    tags: Tag[]
    selectedTags: Tag[]
    onDelete?: (id: string) => void
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
        onDelete?.(id)
    }, [onDelete])

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {tags.map(tag => {
                const isSelected = selectedTags.some(t => t.id === tag.id)
                return (
                    <Badge
                        key={tag.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={cn(
                            'cursor-pointer select-none',
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
                                className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
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
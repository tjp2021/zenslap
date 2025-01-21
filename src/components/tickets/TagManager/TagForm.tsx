import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createTagSchema } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormData = z.infer<typeof createTagSchema>

interface TagFormProps {
    onSubmit: (data: FormData) => Promise<void>
    isLoading?: boolean
    className?: string
}

export function TagForm({ onSubmit, isLoading, className }: TagFormProps) {
    const [color, setColor] = useState('#000000')
    
    const { 
        register, 
        handleSubmit, 
        reset,
        formState: { errors } 
    } = useForm<FormData>({
        resolver: zodResolver(createTagSchema),
        defaultValues: {
            name: '',
            color: '#000000'
        }
    })

    const handleFormSubmit = useCallback(async (data: FormData) => {
        try {
            await onSubmit(data)
            reset()
        } catch (error) {
            // Error is handled by parent component
        }
    }, [onSubmit, reset])

    return (
        <form 
            onSubmit={handleSubmit(handleFormSubmit)} 
            className={cn('space-y-4', className)}
        >
            <div className="space-y-2">
                <Label htmlFor="name">Tag Name</Label>
                <Input
                    id="name"
                    {...register('name')}
                    placeholder="Enter tag name"
                    aria-invalid={!!errors.name}
                    aria-errormessage={errors.name?.message}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="color">Tag Color</Label>
                <div className="flex gap-2">
                    <Input
                        id="color"
                        type="color"
                        {...register('color')}
                        className="w-12 h-12 p-1 cursor-pointer"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        aria-invalid={!!errors.color}
                        aria-errormessage={errors.color?.message}
                    />
                    <Input
                        type="text"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        placeholder="#000000"
                        className="font-mono"
                    />
                </div>
                {errors.color && (
                    <p className="text-sm text-destructive">{errors.color.message}</p>
                )}
            </div>

            <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full"
            >
                {isLoading ? 'Creating...' : 'Create Tag'}
            </Button>
        </form>
    )
} 
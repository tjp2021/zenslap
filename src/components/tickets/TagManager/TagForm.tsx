import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreateTagData } from '@/lib/types'
import { Input, Button, Label } from '@/components/ui'
import { cn } from '@/lib/utils'

const createTagSchema = z.object({
    name: z.string().min(1, 'Tag name is required').max(50, 'Tag name is too long'),
    color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
})

type FormData = z.infer<typeof createTagSchema>

interface TagFormProps {
    onSubmit: (data: CreateTagData) => Promise<void>
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
        if (isLoading) return

        try {
            await onSubmit(data)
            reset()
            setColor('#000000')
        } catch {
            // Handle error silently - UI already shows failure states
        }
    }, [onSubmit, reset, isLoading])

    const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setColor(e.target.value)
    }, [])

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
                    disabled={isLoading}
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
                        onChange={handleColorChange}
                        aria-invalid={!!errors.color}
                        aria-errormessage={errors.color?.message}
                        disabled={isLoading}
                    />
                    <Input
                        type="text"
                        value={color}
                        onChange={handleColorChange}
                        placeholder="#000000"
                        className="font-mono"
                        disabled={isLoading}
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
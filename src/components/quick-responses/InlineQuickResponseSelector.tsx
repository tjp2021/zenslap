import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCategories, useResponses } from '@/lib/hooks/useQuickResponses'
import { QuickResponse, ResponseCategory } from '@/lib/types/quick-responses'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRoleAccess } from '@/hooks/useRoleAccess'

interface InlineQuickResponseSelectorProps {
  onSelect: (content: string) => void
  ticketData?: {
    customer_name?: string
    ticket_id?: string
    agent_name?: string
  }
}

export function InlineQuickResponseSelector({ onSelect, ticketData }: InlineQuickResponseSelectorProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { data: responses, isLoading: responsesLoading } = useResponses()
  const { isAdmin, isAgent } = useRoleAccess()

  // If not an admin or agent, don't render anything
  if (!isAdmin && !isAgent) return null

  const filteredResponses = responses?.filter((response: QuickResponse) => 
    response.title.toLowerCase().includes(search.toLowerCase()) ||
    response.content.toLowerCase().includes(search.toLowerCase())
  ) || []

  const handleSelect = (content: string) => {
    onSelect(content)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredResponses.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev < filteredResponses.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredResponses[selectedIndex]) {
          handleSelect(filteredResponses[selectedIndex].content)
        }
        break
    }
  }

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const isLoading = categoriesLoading || responsesLoading

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Quick Response
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Quick Responses</DialogTitle>
        </DialogHeader>
        <div className="p-2 border-b">
          <Input
            placeholder="Search responses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No responses found
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredResponses.map((response: QuickResponse, index: number) => (
                <button
                  key={response.id}
                  className={`w-full text-left p-2 rounded-md transition-colors ${
                    index === selectedIndex 
                      ? 'bg-accent' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleSelect(response.content)}
                >
                  <div className="font-medium">{response.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {response.content}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 
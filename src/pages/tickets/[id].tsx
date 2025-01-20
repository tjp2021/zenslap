"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Ticket, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/types'

export default function TicketDetails() {
  const router = useRouter()
  const { id } = router.query
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id])

  async function loadTicket() {
    try {
      const response = await fetch(`/api/tickets/${id}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setTicket(data.data)
      }
    } catch (err) {
      setError('Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      id: id as string,
      title: formData.get('title'),
      description: formData.get('description'),
      status: formData.get('status'),
      priority: formData.get('priority'),
    }

    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setTicket(result.data)
        setIsEditing(false)
      }
    } catch (err) {
      setError('Failed to update ticket')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!ticket) return <div>Ticket not found</div>

  return (
    <div className="min-h-screen bg-[#f5f7f2] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ticket Details</h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push('/tickets')}
            >
              Back
            </Button>
            <Button
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={ticket.title}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={ticket.description}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-medium">
                      Status
                    </label>
                    <Select name="status" defaultValue={ticket.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="priority" className="text-sm font-medium">
                      Priority
                    </label>
                    <Select name="priority" defaultValue={ticket.priority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{ticket.title}</h2>
                  <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Status</div>
                    <Badge variant="secondary" className={
                      ticket.status === 'open' ? 'bg-green-50 text-green-700' :
                      ticket.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-700'
                    }>
                      {ticket.status}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Priority</div>
                    <Badge variant="secondary" className={
                      ticket.priority === 'high' ? 'bg-red-50 text-red-700' :
                      ticket.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-700'
                    }>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  <div>Created: {new Date(ticket.created_at).toLocaleString()}</div>
                  <div>Last Updated: {new Date(ticket.updated_at).toLocaleString()}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
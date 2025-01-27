'use client'

import { useState, useEffect } from 'react'
import { useSLAPolicies } from '@/hooks/useSLAPolicies'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { SLAPolicy, SLAPriority } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export function SLAPolicyManager() {
  const { policies, loading, error, createPolicy, updatePolicy, deletePolicy, loadPolicies } = useSLAPolicies()
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null)

  // Load policies on mount
  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading SLA policies: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Priority</TableHead>
            <TableHead>Response Time (hours)</TableHead>
            <TableHead>Resolution Time (hours)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.map((policy) => (
            <TableRow key={policy.id}>
              <TableCell className="font-medium capitalize">{policy.priority}</TableCell>
              <TableCell>{policy.response_time_hours}</TableCell>
              <TableCell>{policy.resolution_time_hours}</TableCell>
              <TableCell>{policy.is_active ? 'Active' : 'Inactive'}</TableCell>
              <TableCell className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingPolicy(policy)}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updatePolicy(policy.id, { is_active: !policy.is_active })}
                >
                  {policy.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this policy?')) {
                      deletePolicy(policy.id)
                    }
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingPolicy ? (
        <div className="border p-4 rounded-lg space-y-4">
          <h3 className="font-medium">Edit Policy</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="number" 
              value={editingPolicy.response_time_hours}
              onChange={(e) => setEditingPolicy({
                ...editingPolicy,
                response_time_hours: parseInt(e.target.value)
              })}
              placeholder="Response Time (hours)"
            />
            <Input 
              type="number"
              value={editingPolicy.resolution_time_hours}
              onChange={(e) => setEditingPolicy({
                ...editingPolicy,
                resolution_time_hours: parseInt(e.target.value)
              })}
              placeholder="Resolution Time (hours)"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline"
              onClick={() => setEditingPolicy(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await updatePolicy(editingPolicy.id, {
                  response_time_hours: editingPolicy.response_time_hours,
                  resolution_time_hours: editingPolicy.resolution_time_hours
                })
                setEditingPolicy(null)
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
} 
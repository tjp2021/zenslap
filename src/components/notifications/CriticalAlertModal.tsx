import { useState, useEffect } from 'react'
import { AlertTriangle, AlertCircle, Timer, UserRound, MapPin, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CriticalAlertNotification } from '@/lib/types/notifications'
import { cn } from '@/lib/utils'

interface CriticalAlertModalProps {
  alert: CriticalAlertNotification
  onAcknowledge: (reason: string) => Promise<void>
  onViewDetails: () => void
  onDismiss?: () => void
}

export function CriticalAlertModal({
  alert,
  onAcknowledge,
  onViewDetails,
  onDismiss
}: CriticalAlertModalProps) {
  const [acknowledgmentReason, setAcknowledgmentReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [playSound, setPlaySound] = useState(true)

  // Play alert sound on mount
  useEffect(() => {
    if (playSound) {
      const audio = new Audio('/sounds/critical-alert.mp3')
      audio.play().catch(console.error)
      setPlaySound(false)
    }
  }, [playSound])

  const handleAcknowledge = async () => {
    if (!acknowledgmentReason.trim()) return
    
    setIsSubmitting(true)
    try {
      await onAcknowledge(acknowledgmentReason)
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onDismiss?.()}>
      <DialogContent className="sm:max-w-[700px] bg-red-50 border-red-200">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6" />
            Critical Alert - Immediate Action Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Alert Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">Crisis Type</h3>
                <p className={cn(
                  "text-lg font-medium",
                  getSeverityColor(alert.alert.severity)
                )}>
                  {alert.alert.crisis_type.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-lg">Response Protocol</h3>
                <p className="text-lg font-medium text-red-600">
                  {alert.alert.response_protocol.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-gray-500" />
                <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
              </div>
              {alert.alert.metadata?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <span>{alert.alert.metadata.location}</span>
                </div>
              )}
            </div>

            {/* Risk Factors */}
            {alert.alert.metadata?.risk_factors && alert.alert.metadata.risk_factors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700">Risk Factors:</h4>
                <ul className="list-disc list-inside mt-2">
                  {alert.alert.metadata.risk_factors.map((factor, index) => (
                    <li key={index} className="text-red-600">{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Context */}
            <div className="mt-4">
              <h4 className="font-medium text-gray-700">Context:</h4>
              <p className="mt-2 text-gray-800">{alert.activity.content}</p>
            </div>
          </div>

          {/* Acknowledgment Section */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-red-700">
              Acknowledgment Reason (Required)
            </Label>
            <Textarea
              id="reason"
              value={acknowledgmentReason}
              onChange={(e) => setAcknowledgmentReason(e.target.value)}
              placeholder="Please provide a detailed reason for acknowledgment..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              onClick={onViewDetails}
              className="w-full sm:w-auto"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Full Details
            </Button>
            <Button
              variant="destructive"
              onClick={handleAcknowledge}
              disabled={!acknowledgmentReason.trim() || isSubmitting}
              className="w-full sm:w-auto ml-auto"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Acknowledging...' : 'Acknowledge Alert'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
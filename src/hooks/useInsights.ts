import { useState, useCallback } from 'react'
import { AIService } from '@/lib/services/ai-service'
import { AnalysisRequest, TicketAnalysis, DetailedFeedback } from '@/types/ai'
import { useToast } from '@/components/ui/use-toast'

export function useInsights() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<TicketAnalysis | null>(null)
  const { toast } = useToast()
  
  const analyzeTicket = useCallback(async (request: AnalysisRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const aiService = AIService.getInstance()
      const result = await aiService.analyzeTicket(request)
      setAnalysis(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze ticket'
      setError(message)
      toast({
        title: 'Analysis Failed',
        description: message,
        variant: 'destructive'
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const submitFeedback = useCallback(async (feedback: DetailedFeedback) => {
    try {
      const aiService = AIService.getInstance()
      await aiService.trackFeedback(feedback)
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit feedback'
      toast({
        title: 'Feedback Failed',
        description: message,
        variant: 'destructive'
      })
      throw err
    }
  }, [toast])

  const getMetrics = useCallback(async () => {
    try {
      const aiService = AIService.getInstance()
      return aiService.getMetrics()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get metrics'
      toast({
        title: 'Metrics Failed',
        description: message,
        variant: 'destructive'
      })
      throw err
    }
  }, [toast])

  return {
    isLoading,
    error,
    analysis,
    analyzeTicket,
    submitFeedback,
    getMetrics
  }
} 
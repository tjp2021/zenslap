import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { TicketAnalysis, DetailedFeedback } from '@/types/ai'
import { useInsights } from '@/hooks/useInsights'

interface InsightPanelProps {
  ticketId: string
  content: string
}

export function InsightPanel({ ticketId, content }: InsightPanelProps) {
  const { isLoading, error, analysis, analyzeTicket, submitFeedback } = useInsights()
  const [feedback, setFeedback] = useState<Partial<DetailedFeedback>>({
    helpful: false,
    accuracy: 0.5,
    relevance: 0.5,
    actionability: '',
    comments: ''
  })

  const handleAnalyze = async () => {
    await analyzeTicket({
      ticketId,
      content
    })
  }

  const handleFeedback = async () => {
    if (!analysis?.patterns[0]) return

    await submitFeedback({
      patternId: analysis.patterns[0].id,
      helpful: feedback.helpful ?? false,
      accuracy: feedback.accuracy ?? 0.5,
      relevance: feedback.relevance ?? 0.5,
      actionability: feedback.actionability ?? 'neutral',
      comments: feedback.comments
    })
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-500">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
          <CardDescription>Analyze this ticket for patterns and insights</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={handleAnalyze} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze Ticket'}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
        <CardDescription>
          Confidence: {Math.round(analysis.confidence * 100)}%
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Analysis Content */}
        <div className="prose dark:prose-invert">
          <h3>Analysis</h3>
          <p>{analysis.analysis}</p>
        </div>

        {/* Similar Patterns */}
        {analysis.patterns.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Similar Patterns</h3>
            <div className="space-y-2">
              {analysis.patterns.map((pattern, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{pattern.explanation}</p>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {Math.round(pattern.confidence * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Form */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">Provide Feedback</h3>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Was this helpful?</p>
            <div className="flex space-x-2">
              <Button
                variant={feedback.helpful ? 'default' : 'outline'}
                onClick={() => setFeedback(prev => ({ ...prev, helpful: true }))}
              >
                Yes
              </Button>
              <Button
                variant={feedback.helpful === false ? 'default' : 'outline'}
                onClick={() => setFeedback(prev => ({ ...prev, helpful: false }))}
              >
                No
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Accuracy</p>
            <Slider
              value={[feedback.accuracy ?? 0.5]}
              onValueChange={(values: number[]) => 
                setFeedback(prev => ({ ...prev, accuracy: values[0] }))
              }
              max={1}
              step={0.1}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Relevance</p>
            <Slider
              value={[feedback.relevance ?? 0.5]}
              onValueChange={(values: number[]) => 
                setFeedback(prev => ({ ...prev, relevance: values[0] }))
              }
              max={1}
              step={0.1}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Comments</p>
            <Textarea
              placeholder="Any additional feedback..."
              value={feedback.comments ?? ''}
              onChange={(e) => 
                setFeedback(prev => ({ ...prev, comments: e.target.value }))
              }
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleFeedback}>Submit Feedback</Button>
      </CardFooter>
    </Card>
  )
} 
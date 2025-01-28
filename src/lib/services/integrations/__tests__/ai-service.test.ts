import { AIService } from '../../ai-service'
import { ChromaService } from '../chroma'
import { OpenAIService } from '../openai'
import { generateTestTicket, generateTestDataset, generateRelatedTickets, generateTestFeedback } from './test-data-generator'
import { createClient } from '../../../../lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

// Mock dependencies
jest.mock('../chroma', () => ({
  ChromaService: {
    getInstance: jest.fn().mockReturnValue({
      indexTicket: jest.fn(),
      findPatterns: jest.fn(),
      getMetrics: jest.fn()
    })
  }
}))

jest.mock('../openai', () => ({
  OpenAIService: {
    getInstance: jest.fn().mockReturnValue({
      generateAnalysis: jest.fn()
    })
  }
}))

// Mock Supabase client
jest.mock('../../../../lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    }))
  }))
}))

describe('AIService', () => {
  let aiService: AIService
  let mockChromaService: jest.Mocked<ChromaService>
  let mockOpenAIService: jest.Mocked<OpenAIService>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup mock services
    mockChromaService = ChromaService.getInstance() as jest.Mocked<ChromaService>
    mockOpenAIService = OpenAIService.getInstance() as jest.Mocked<OpenAIService>
    
    // Mock successful responses
    ;(mockChromaService.findPatterns as jest.Mock).mockResolvedValue([
      {
        type: 'technical',
        confidence: 0.8,
        explanation: 'Test pattern',
        relatedTickets: generateRelatedTickets()
      }
    ])
    ;(mockOpenAIService.generateAnalysis as jest.Mock).mockResolvedValue({
      content: 'Test analysis',
      tokensUsed: 100
    })
    ;(mockChromaService.indexTicket as jest.Mock).mockResolvedValue(undefined)

    // Reset AIService singleton and create new instance
    ;(AIService as any).instance = null
    aiService = AIService.getInstance()
  })

  afterEach(() => {
    // Reset the singleton instance after each test
    ;(AIService as any).instance = null
  })

  describe('Ticket Analysis', () => {
    it('should analyze a technical support ticket', async () => {
      const ticket = generateTestTicket('technical')
      const mockPatterns = [
        {
          id: uuidv4(),
          type: 'similar_tickets' as const,
          confidence: 0.85,
          relatedTickets: generateRelatedTickets(),
          explanation: 'Found similar technical issue',
          metadata: {
            category: 'technical',
            priority: 'medium'
          }
        }
      ]

      // Mock ChromaService
      mockChromaService.indexTicket.mockResolvedValueOnce(undefined)
      mockChromaService.findPatterns.mockResolvedValueOnce(mockPatterns)

      // Mock OpenAIService
      mockOpenAIService.generateAnalysis.mockResolvedValueOnce({
        content: 'Analysis of technical issue',
        tokensUsed: 150
      })

      const result = await aiService.analyzeTicket({
        ticketId: ticket.ticketId,
        content: ticket.content
      })

      expect(result).toMatchObject({
        patterns: expect.arrayContaining([
          expect.objectContaining({
            type: 'similar_tickets',
            confidence: expect.any(Number)
          })
        ]),
        analysis: expect.any(String),
        confidence: expect.any(Number),
        metadata: expect.objectContaining({
          processingTime: expect.any(Number),
          modelUsed: 'gpt-4',
          tokensUsed: expect.any(Number)
        })
      })
    })

    it('should handle urgent support tickets with high priority', async () => {
      const ticket = generateTestTicket('urgent')
      const mockPatterns = [
        {
          id: uuidv4(),
          type: 'similar_tickets' as const,
          confidence: 0.9,
          relatedTickets: generateRelatedTickets(),
          explanation: 'Found similar urgent issue',
          metadata: {
            category: 'urgent',
            priority: 'critical'
          }
        }
      ]

      mockChromaService.indexTicket.mockResolvedValueOnce(undefined)
      mockChromaService.findPatterns.mockResolvedValueOnce(mockPatterns)
      mockOpenAIService.generateAnalysis.mockResolvedValueOnce({
        content: 'Urgent issue analysis',
        tokensUsed: 200
      })

      const result = await aiService.analyzeTicket({
        ticketId: ticket.ticketId,
        content: ticket.content,
        metadata: { priority: 'high' }
      })

      expect(result.metadata?.processingTime).toBeLessThan(5000) // Urgent tickets should be processed quickly
      expect(result.confidence).toBeGreaterThan(0.8) // High confidence for urgent issues
    })

    it('should handle privacy-related tickets with sensitive data', async () => {
      const ticket = generateTestTicket('privacy')
      
      mockChromaService.indexTicket.mockResolvedValueOnce(undefined)
      mockChromaService.findPatterns.mockResolvedValueOnce([])
      mockOpenAIService.generateAnalysis.mockResolvedValueOnce({
        content: 'Privacy concern analysis',
        tokensUsed: 180
      })

      const result = await aiService.analyzeTicket({
        ticketId: ticket.ticketId,
        content: ticket.content,
        metadata: { containsSensitiveData: true }
      })

      expect(result.analysis.toLowerCase()).toContain('privacy')
      expect(mockChromaService.indexTicket).toHaveBeenCalledWith(
        ticket.ticketId,
        ticket.content
      )
    })
  })

  describe('Feedback System', () => {
    it('should track and store feedback correctly', async () => {
      const ticket = generateTestTicket()
      const feedback = generateTestFeedback(ticket.ticketId, true)

      // Mock Supabase client for this test
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })
      ;(createClient as jest.Mock).mockReturnValue({ from: mockFrom })

      await aiService.trackFeedback(feedback)

      expect(mockFrom).toHaveBeenCalledWith('insight_feedback')
      expect(mockInsert).toHaveBeenCalledWith({
        pattern_id: feedback.patternId,
        helpful: feedback.helpful,
        accuracy: 1, // Normalized to number
        relevance: 1, // Normalized to number
        actionability: feedback.actionability,
        comments: feedback.comments,
        user_id: feedback.userId,
        created_at: expect.any(String)
      })
    })

    it('should update metrics when feedback is received', async () => {
      const ticket = generateTestTicket()
      const feedback = generateTestFeedback(ticket.ticketId, true)

      // Mock Supabase client
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })
      ;(createClient as jest.Mock).mockReturnValue({ from: mockFrom })

      await aiService.trackFeedback(feedback)

      const metrics = aiService.getMetrics()
      expect(metrics.feedbackStats.helpful).toBeGreaterThan(0)
      expect(metrics.feedbackStats.accuracy).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle ChromaDB indexing failures gracefully', async () => {
      const ticket = generateTestTicket()
      mockChromaService.indexTicket.mockRejectedValueOnce(new Error('Indexing failed'))

      await expect(aiService.analyzeTicket({
        ticketId: ticket.ticketId,
        content: ticket.content
      })).rejects.toThrow('Indexing failed')

      const metrics = aiService.getMetrics()
      expect(metrics.successRate).toBeLessThan(1)
    })

    it('should handle OpenAI API failures', async () => {
      const ticket = generateTestTicket()
      mockChromaService.indexTicket.mockResolvedValueOnce(undefined)
      mockChromaService.findPatterns.mockResolvedValueOnce([])
      mockOpenAIService.generateAnalysis.mockRejectedValueOnce(new Error('API error'))

      await expect(aiService.analyzeTicket({
        ticketId: ticket.ticketId,
        content: ticket.content
      })).rejects.toThrow('API error')

      const metrics = aiService.getMetrics()
      expect(metrics.successRate).toBeLessThan(1)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track processing time for ticket analysis', async () => {
      const startTime = Date.now()
      const tickets = generateTestDataset(5)

      // Reset metrics by creating a new instance
      ;(AIService as any).instance = null
      aiService = AIService.getInstance()

      // Mock successful responses with delays
      ;(mockChromaService.indexTicket as jest.Mock).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return undefined
      })
      ;(mockChromaService.findPatterns as jest.Mock).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return [{
          type: 'technical',
          confidence: 0.8,
          explanation: 'Test pattern',
          relatedTickets: generateRelatedTickets()
        }]
      })
      ;(mockOpenAIService.generateAnalysis as jest.Mock).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return {
          content: 'Test analysis',
          tokensUsed: 100
        }
      })

      // Process tickets
      for (const ticket of tickets) {
        await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content
        })
      }

      const metrics = aiService.getMetrics()
      expect(metrics.averageLatency).toBeGreaterThan(0)
      expect(metrics.requestCount).toBe(5)
      expect(metrics.successRate).toBe(1) // All requests should be successful
      expect(Date.now() - startTime).toBeLessThan(10000) // Should process 5 tickets under 10s
    })
  })

  describe('Crisis Detection and Response', () => {
    describe('Immediate Crisis Detection', () => {
      it('should detect explicit suicidal intent with highest priority', async () => {
        const ticket = generateTestTicket('suicide_risk', {
          content: 'I am going to kill myself tonight, I have the means ready',
          metadata: { severity: 'critical' }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([{
          type: 'suicide_risk',
          confidence: 0.95,
          explanation: 'Explicit suicidal intent detected with immediate plan',
          relatedTickets: generateRelatedTickets(),
          metadata: {
            requiresImmediate: true,
            severity: 'critical',
            hasActionablePlan: true
          }
        }])

        const startTime = Date.now()
        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.confidence).toBeGreaterThan(0.9)
        expect(Date.now() - startTime).toBeLessThan(1000)
        expect(result.metadata?.requiresImmediate).toBe(true)
        expect(result.metadata?.severity).toBe('critical')
        expect(result.patterns[0].metadata?.hasActionablePlan).toBe(true)
      })

      it('should identify indirect/passive suicidal ideation', async () => {
        const ticket = generateTestTicket('suicide_risk', {
          content: 'I just feel so tired of everything, maybe everyone would be better off without me',
          metadata: { severity: 'high' }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([{
          type: 'suicide_risk',
          confidence: 0.85,
          explanation: 'Passive suicidal ideation detected',
          relatedTickets: generateRelatedTickets(),
          metadata: {
            requiresImmediate: true,
            severity: 'high',
            isPassiveIdeation: true
          }
        }])

        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.confidence).toBeGreaterThan(0.8)
        expect(result.metadata?.requiresImmediate).toBe(true)
        expect(result.patterns[0].metadata?.isPassiveIdeation).toBe(true)
      })
    })

    describe('Complex Crisis Scenarios', () => {
      it('should handle multiple crisis indicators in single ticket', async () => {
        const ticket = generateTestTicket('severe_distress', {
          content: 'I can\'t breathe, having a panic attack. I want to end it all, I can\'t take this anymore',
          metadata: { severity: 'critical' }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([
          {
            type: 'panic_attack',
            confidence: 0.9,
            explanation: 'Active panic attack symptoms',
            relatedTickets: generateRelatedTickets(),
            metadata: { requiresImmediate: true, severity: 'high' }
          },
          {
            type: 'suicide_risk',
            confidence: 0.85,
            explanation: 'Suicidal ideation during crisis',
            relatedTickets: generateRelatedTickets(),
            metadata: { requiresImmediate: true, severity: 'critical' }
          }
        ])

        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.patterns).toHaveLength(2)
        expect(result.metadata?.severity).toBe('critical')
        expect(result.patterns[0].confidence).toBeGreaterThan(0.8)
        expect(result.patterns[1].confidence).toBeGreaterThan(0.8)
      })

      it('should track crisis pattern escalation', async () => {
        const initialTicket = generateTestTicket('severe_distress', {
          content: 'I\'ve been feeling really down lately',
          metadata: { severity: 'medium' }
        })

        const escalatedTicket = generateTestTicket('self_harm', {
          content: 'The urge to hurt myself is getting stronger',
          metadata: { severity: 'high' }
        })

        mockChromaService.findPatterns
          .mockResolvedValueOnce([{
            type: 'emotional_distress',
            confidence: 0.7,
            explanation: 'Initial signs of distress',
            relatedTickets: [],
            metadata: { severity: 'medium' }
          }])
          .mockResolvedValueOnce([{
            type: 'self_harm',
            confidence: 0.85,
            explanation: 'Escalating self-harm risk',
            relatedTickets: [initialTicket.ticketId],
            metadata: { 
              severity: 'high',
              escalatedFrom: initialTicket.ticketId,
              requiresImmediate: true
            }
          }])

        await aiService.analyzeTicket({
          ticketId: initialTicket.ticketId,
          content: initialTicket.content,
          metadata: initialTicket.metadata
        })

        const result = await aiService.analyzeTicket({
          ticketId: escalatedTicket.ticketId,
          content: escalatedTicket.content,
          metadata: escalatedTicket.metadata
        })

        expect(result.patterns[0].metadata?.escalatedFrom).toBe(initialTicket.ticketId)
        expect(result.metadata?.severity).toBe('high')
        expect(result.metadata?.requiresImmediate).toBe(true)
      })
    })

    describe('Crisis Response Protocols', () => {
      it('should trigger immediate intervention for severe crisis', async () => {
        const ticket = generateTestTicket('suicide_risk', {
          content: 'I have the pills ready, this is goodbye',
          metadata: { 
            severity: 'critical',
            requiresImmediate: true
          }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([{
          type: 'suicide_risk',
          confidence: 0.98,
          explanation: 'Imminent suicide risk with means',
          relatedTickets: generateRelatedTickets(),
          metadata: {
            requiresImmediate: true,
            severity: 'critical',
            responseProtocol: 'immediate_intervention',
            auditLog: ['crisis_detected', 'immediate_response_required']
          }
        }])

        mockOpenAIService.generateAnalysis.mockResolvedValueOnce({
          content: 'Critical situation requiring immediate intervention. Patient has expressed clear suicidal intent with means.',
          tokensUsed: 100
        })

        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.metadata?.responseProtocol).toBe('immediate_intervention')
        expect(result.metadata?.auditLog).toContain('crisis_detected')
        expect(result.metadata?.auditLog).toContain('immediate_response_required')
        expect(result.confidence).toBeGreaterThan(0.95)
      })

      it('should handle medical emergency with location context', async () => {
        const ticket = generateTestTicket('medical_emergency', {
          content: 'Having severe chest pains, can\'t breathe',
          metadata: {
            severity: 'critical',
            location: {
              country: 'US',
              timezone: 'America/New_York'
            }
          }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([{
          type: 'medical_emergency',
          confidence: 0.95,
          explanation: 'Potential cardiac event',
          relatedTickets: generateRelatedTickets(),
          metadata: {
            requiresImmediate: true,
            severity: 'critical',
            responseProtocol: 'emergency_services',
            locationBased: true
          }
        }])

        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.metadata?.responseProtocol).toBe('emergency_services')
        expect(result.metadata?.locationBased).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.9)
      })
    })

    describe('Crisis Classification Accuracy', () => {
      it('should not misclassify non-crisis mental health discussions', async () => {
        const ticket = generateTestTicket('general', {
          content: 'I want to discuss my anxiety and depression with a therapist',
          metadata: { severity: 'low' }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([{
          type: 'mental_health',
          confidence: 0.8,
          explanation: 'General mental health inquiry',
          relatedTickets: generateRelatedTickets(),
          metadata: {
            requiresImmediate: false,
            severity: 'low',
            isGeneralInquiry: true
          }
        }])

        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.metadata?.requiresImmediate).toBe(false)
        expect(result.metadata?.severity).toBe('low')
        expect(result.patterns[0].metadata?.isGeneralInquiry).toBe(true)
      })

      it('should handle metaphorical language appropriately', async () => {
        const ticket = generateTestTicket('general', {
          content: 'This project is killing me, I\'m dying to get it done',
          metadata: { severity: 'low' }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([{
          type: 'general_stress',
          confidence: 0.7,
          explanation: 'Common stress-related metaphors',
          relatedTickets: generateRelatedTickets(),
          metadata: {
            requiresImmediate: false,
            severity: 'low',
            isMetaphorical: true
          }
        }])

        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.metadata?.requiresImmediate).toBe(false)
        expect(result.patterns[0].metadata?.isMetaphorical).toBe(true)
        expect(result.confidence).toBeLessThan(0.8)
      })
    })

    describe('Cultural Context', () => {
      it('should recognize indirect expressions of distress across different communication styles', async () => {
        const ticket = generateTestTicket('severe_distress', {
          content: 'I have brought shame to my family and cannot face them anymore',
          metadata: {
            language_style: 'indirect',
            cultural_context: 'collective_family_oriented',
            severity: 'high'
          }
        })

        mockChromaService.findPatterns.mockResolvedValueOnce([{
          type: 'cultural_distress',
          confidence: 0.85,
          explanation: 'Detected indirect expression of severe distress with family-honor context',
          relatedTickets: generateRelatedTickets(),
          metadata: {
            requiresImmediate: true,
            severity: 'high',
            cultural_context: 'collective_family_oriented',
            indirect_expression: true
          }
        }])

        mockOpenAIService.generateAnalysis.mockResolvedValueOnce({
          content: 'Analysis indicates severe distress expressed through cultural context of family honor and shame. The indirect language suggests deep emotional pain related to family relationships.',
          tokensUsed: 100
        })

        const result = await aiService.analyzeTicket({
          ticketId: ticket.ticketId,
          content: ticket.content,
          metadata: ticket.metadata
        })

        expect(result.confidence).toBeGreaterThan(0.8)
        expect(result.analysis).toContain('family')
        expect(result.analysis).toContain('shame')
        expect(result.metadata?.requiresImmediate).toBe(true)
        expect(result.patterns[0].metadata?.indirect_expression).toBe(true)
        expect(result.patterns[0].metadata?.cultural_context).toBe('collective_family_oriented')
      })
    })
  })
}) 
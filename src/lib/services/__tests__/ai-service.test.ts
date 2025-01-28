import { AIService } from '../ai-service'
import { OpenAIService } from '../integrations/openai'
import { ChromaService, InsightPattern } from '../integrations/chroma'
import { jest } from '@jest/globals'
import { CrisisType } from '../../../types/ai'

// Mock our dependencies
jest.mock('../integrations/openai')
jest.mock('../integrations/chroma')
jest.mock('../../supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: () => Promise.resolve({ error: null })
    })
  })
}))

describe('AIService - Crisis Detection', () => {
  let aiService: AIService
  
  const mockCrisisResponse = {
    content: JSON.stringify({
      crisisType: 'suicide_risk',
      severityLevel: 'high',
      responseProtocol: 'immediate_intervention',
      requiresImmediate: true,
      hasActionablePlan: true,
      isPassiveIdeation: false,
      locationBased: true,
      culturalContext: null,
      isMetaphorical: false,
      isGeneralInquiry: false,
      explanation: 'User expressing immediate suicidal thoughts with a plan',
      confidence: 0.95,
      reasoning: 'Direct expression of suicidal intent with specific plan mentioned'
    }),
    tokensUsed: 150
  }

  const mockNonCrisisResponse = {
    content: JSON.stringify({
      crisisType: 'general_stress',
      severityLevel: 'low',
      responseProtocol: 'standard_response',
      requiresImmediate: false,
      hasActionablePlan: false,
      isPassiveIdeation: false,
      locationBased: false,
      culturalContext: null,
      isMetaphorical: false,
      isGeneralInquiry: true,
      explanation: 'User discussing general stress without crisis indicators',
      confidence: 0.85,
      reasoning: 'Content suggests normal stress levels without immediate risk'
    }),
    tokensUsed: 120
  }

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Reset singleton instance
    // @ts-ignore - accessing private property for testing
    AIService.instance = null
    
    // Setup default mock implementations
    const mockOpenAI = {
      generateAnalysis: jest.fn(),
      countTokens: jest.fn()
    }
    jest.mocked(OpenAIService.getInstance).mockReturnValue(mockOpenAI as unknown as OpenAIService)

    const mockChroma = {
      indexTicket: jest.fn(),
      // @ts-ignore - Jest typing issue with mockResolvedValue
      findPatterns: jest.fn().mockResolvedValue([])
    }
    jest.mocked(ChromaService.getInstance).mockReturnValue(mockChroma as unknown as ChromaService)

    aiService = AIService.getInstance()
  })

  describe('analyzeCrisis', () => {
    it('should correctly identify high-risk crisis situations', async () => {
      // Setup
      const mockOpenAI = jest.mocked(OpenAIService.getInstance())
      mockOpenAI.generateAnalysis.mockResolvedValue(mockCrisisResponse)

      // Test
      const result = await aiService.analyzeCrisis(
        'test-ticket-id',
        'I can\'t take it anymore. I have the pills ready.'
      )

      // Assertions
      expect(result.metadata?.severity).toBe('high')
      expect(result.metadata?.requiresImmediate).toBe(true)
      expect(result.confidence).toBe(0.95)
      expect(mockOpenAI.generateAnalysis).toHaveBeenCalledWith(
        expect.stringContaining('expert mental health support analyst'),
        expect.objectContaining({
          temperature: 0.3,
          maxTokens: 500
        })
      )
    })

    it('should correctly identify non-crisis situations', async () => {
      // Setup
      const mockOpenAI = jest.mocked(OpenAIService.getInstance())
      mockOpenAI.generateAnalysis.mockResolvedValue(mockNonCrisisResponse)

      // Test
      const result = await aiService.analyzeCrisis(
        'test-ticket-id',
        'I\'ve been feeling a bit stressed about work lately.'
      )

      // Assertions
      expect(result.metadata?.severity).toBe('low')
      expect(result.metadata?.requiresImmediate).toBe(false)
      expect(result.metadata?.crisisType).toBe('general_stress')
    })

    it('should handle invalid JSON responses', async () => {
      // Setup
      const mockOpenAI = jest.mocked(OpenAIService.getInstance())
      mockOpenAI.generateAnalysis.mockResolvedValue({
        content: 'Invalid JSON response',
        tokensUsed: 50
      })

      // Test & Assert
      await expect(
        aiService.analyzeCrisis('test-ticket-id', 'test content')
      ).rejects.toThrow('Failed to parse crisis analysis result')
    })

    it('should use historical patterns in analysis', async () => {
      // Setup
      const mockChroma = jest.mocked(ChromaService.getInstance())
      const mockPatterns: InsightPattern[] = [{
        id: 'pattern-1',
        type: 'similar_tickets',
        confidence: 0.8,
        explanation: 'Similar crisis case from the past',
        relatedTickets: ['ticket-1'],
        metadata: { severity: 'high' }
      }]
      mockChroma.findPatterns.mockResolvedValue(mockPatterns)
      
      const mockOpenAI = jest.mocked(OpenAIService.getInstance())
      mockOpenAI.generateAnalysis.mockResolvedValue(mockCrisisResponse)

      // Test
      const result = await aiService.analyzeCrisis(
        'test-ticket-id',
        'test content'
      )

      // Assertions
      expect(mockChroma.findPatterns).toHaveBeenCalledWith('test-ticket-id')
      expect(mockOpenAI.generateAnalysis).toHaveBeenCalledWith(
        expect.stringContaining('Similar crisis case from the past'),
        expect.any(Object)
      )
    })

    it('should update metrics after analysis', async () => {
      // Setup
      const mockOpenAI = jest.mocked(OpenAIService.getInstance())
      mockOpenAI.generateAnalysis.mockResolvedValue(mockCrisisResponse)

      // Mock Date.now() to simulate time passing
      let callCount = 0
      const startTime = 1000 // arbitrary start time
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++
        // First call returns start time, second call simulates 100ms elapsed
        return startTime + (callCount > 1 ? 100 : 0)
      })

      // Test
      await aiService.analyzeCrisis('test-ticket-id', 'test content')
      const metrics = aiService.getMetrics()

      // Cleanup
      jest.restoreAllMocks()

      // Assertions
      expect(metrics.requestCount).toBe(1)
      expect(metrics.successRate).toBeGreaterThan(0)
      expect(metrics.averageLatency).toBeGreaterThan(0)
    })
  })
}) 
import { AIService } from '../../ai-service'
import { RealTimeMonitor } from '../../queue/real-time-monitor'
import { MessageQueue } from '../../queue/message-queue'
import { TicketAnalysis, Severity, AnalysisRequest } from '@/types/ai'
import { jest } from '@jest/globals'

// Mock AIService
jest.mock('../../ai-service')

const createMockAnalysis = (severity: Severity): TicketAnalysis => ({
  patterns: [],
  analysis: 'Mock analysis',
  confidence: 0.9,
  metadata: {
    severity,
    processingTime: 100,
    modelUsed: 'gpt-4',
    tokensUsed: 100,
    requiresImmediate: severity === 'critical' || severity === 'high',
    crisisType: 'emotional_distress',
    responseProtocol: 'standard_response',
    hasActionablePlan: false,
    isPassiveIdeation: false,
    locationBased: false,
    culturalContext: undefined,
    isMetaphorical: false,
    isGeneralInquiry: true,
    reasoning: 'Mock reasoning',
    auditLog: []
  }
})

describe('RealTimeMonitor', () => {
  let monitor: RealTimeMonitor
  let messageQueue: MessageQueue
  let aiService: jest.Mocked<AIService>

  beforeEach(() => {
    messageQueue = new MessageQueue()
    
    aiService = {
      getInstance: jest.fn().mockReturnThis(),
      resetInstance: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
      analyze: jest.fn(),
      generateSummary: jest.fn(),
      generateTags: jest.fn(),
      generateTitle: jest.fn(),
      analyzeCrisis: jest.fn().mockImplementation(async () => createMockAnalysis('medium')),
      analyzeTicket: jest.fn().mockImplementation(async () => createMockAnalysis('medium')),
      trackFeedback: jest.fn(),
      getMetrics: jest.fn()
    } as unknown as jest.Mocked<AIService>
    
    // Mock the static getInstance method
    jest.spyOn(AIService, 'getInstance').mockReturnValue(aiService)
    
    monitor = new RealTimeMonitor(messageQueue, aiService, {
      pollIntervalMs: 10, // Reduce poll interval for faster tests
      maxBatchSize: 5,
      maxProcessingTimeMs: 100,
      errorThreshold: 3
    })
  })

  afterEach(() => {
    monitor.stop()
    jest.clearAllMocks()
  })

  describe('start', () => {
    it('should process messages in the queue', async () => {
      // Add test messages
      await messageQueue.enqueue({ content: 'Test message 1' })
      await messageQueue.enqueue({ content: 'Test message 2' })

      // Start monitor
      const monitorPromise = monitor.start()
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Stop monitor
      monitor.stop()
      await monitorPromise

      // Verify processing
      const metrics = monitor.getMetrics()
      expect(metrics.processedCount).toBe(2)
      expect(metrics.errorCount).toBe(0)
      expect(aiService.analyzeTicket).toHaveBeenCalledTimes(2)
    })

    it('should handle critical messages properly', async () => {
      // Mock critical response
      aiService.analyzeTicket.mockResolvedValueOnce(
        createMockAnalysis('critical')
      )

      // Add critical message
      await messageQueue.enqueue({ 
        content: 'Critical message',
        metadata: { priority: 'high' }
      })

      // Start monitor
      const monitorPromise = monitor.start()
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Stop monitor
      monitor.stop()
      await monitorPromise

      // Verify critical alert handling
      const metrics = monitor.getMetrics()
      expect(metrics.criticalAlertCount).toBe(1)
    })

    it('should stop on error threshold exceeded', async () => {
      // Mock error response
      aiService.analyzeTicket.mockRejectedValue(new Error('Test error'))

      // Add test messages
      await messageQueue.enqueue({ content: 'Error message 1' })
      await messageQueue.enqueue({ content: 'Error message 2' })
      await messageQueue.enqueue({ content: 'Error message 3' })

      // Start monitor and expect it to stop on errors
      await expect(monitor.start()).rejects.toThrow('Monitor stopped due to error threshold exceeded')

      // Verify error handling
      const metrics = monitor.getMetrics()
      expect(metrics.errorCount).toBe(3) // Should match errorThreshold
      expect(metrics.processedCount).toBe(0)
    }, 2000) // Increase timeout to 2 seconds
  })

  describe('metrics', () => {
    it('should track processing time correctly', async () => {
      // Mock delayed processing
      aiService.analyzeTicket.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return createMockAnalysis('low')
      })

      // Add test message
      await messageQueue.enqueue({ content: 'Test message' })

      // Start monitor
      const monitorPromise = monitor.start()
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Stop monitor
      monitor.stop()
      await monitorPromise

      // Verify timing metrics
      const metrics = monitor.getMetrics()
      expect(metrics.averageProcessingTime).toBeGreaterThan(0)
      expect(metrics.lastProcessedTimestamp).toBeDefined()
    })

    it('should warn on exceeded processing time', async () => {
      // Mock console.warn
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock slow processing
      aiService.analyzeTicket.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
        return createMockAnalysis('low')
      })

      // Add test message
      await messageQueue.enqueue({ content: 'Slow message' })

      // Start monitor
      const monitorPromise = monitor.start()
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Stop monitor
      monitor.stop()
      await monitorPromise

      // Verify warning was logged
      expect(consoleWarn).toHaveBeenCalledWith(
        'Message processing exceeded time limit:',
        expect.any(Object)
      )

      // Cleanup
      consoleWarn.mockRestore()
    })
  })
}) 
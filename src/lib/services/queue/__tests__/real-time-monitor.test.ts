import { RealTimeMonitor } from '../real-time-monitor'
import { MessageQueue } from '../message-queue'
import { AIService } from '../../ai-service'
import { TicketAnalysis, Severity } from '@/types/ai'
import { jest } from '@jest/globals'
import { NotificationService } from '../../notification-service'

// Mock AIService
jest.mock('../../ai-service')

describe('RealTimeMonitor', () => {
  let monitor: RealTimeMonitor
  let queue: MessageQueue
  let aiService: jest.Mocked<AIService>
  let notificationService: jest.Mocked<NotificationService>

  const createMockAnalysis = (
    severity: Severity,
    requiresImmediate: boolean = false
  ): TicketAnalysis => ({
    patterns: [],
    analysis: 'Test analysis',
    confidence: 0.9,
    metadata: {
      processingTime: 100,
      modelUsed: 'gpt-4',
      tokensUsed: 150,
      severity,
      requiresImmediate,
      responseProtocol: requiresImmediate ? 'immediate_intervention' : 'standard_response'
    }
  })

  beforeEach(() => {
    // Setup mocks
    queue = new MessageQueue({
      maxBatchSize: 5,
      maxLatencyMs: 50
    })

    aiService = {
      analyzeTicket: jest.fn().mockResolvedValue(createMockAnalysis('medium')),
      getInstance: jest.fn(),
      resetInstance: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
      analyze: jest.fn(),
      generateSummary: jest.fn(),
      generateTags: jest.fn(),
      generateTitle: jest.fn(),
      analyzeCrisis: jest.fn(),
      trackFeedback: jest.fn(),
      getMetrics: jest.fn()
    } as unknown as jest.Mocked<AIService>

    notificationService = {
      createCriticalAlert: jest.fn().mockResolvedValue(undefined)
    } as any

    // Create monitor with test config
    monitor = new RealTimeMonitor(queue, aiService, {
      pollIntervalMs: 10,
      maxBatchSize: 5,
      maxProcessingTimeMs: 100,
      errorThreshold: 3,
      notificationService
    })
  })

  afterEach(() => {
    monitor.stop()
    jest.clearAllMocks()
  })

  describe('start', () => {
    it('should process messages in the queue', async () => {
      // Add test messages
      await queue.enqueue({ content: 'Test message 1' })
      await queue.enqueue({ content: 'Test message 2' })

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
        createMockAnalysis('critical', true)
      )

      // Add critical message
      await queue.enqueue({ 
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
      for (let i = 0; i < 5; i++) {
        await queue.enqueue({ content: `Error message ${i}` })
      }

      // Start monitor and expect it to stop on errors
      await expect(monitor.start()).rejects.toThrow('Monitor stopped due to error threshold exceeded')

      // Verify error handling
      const metrics = monitor.getMetrics()
      expect(metrics.errorCount).toBe(3) // Should match errorThreshold
      expect(metrics.processedCount).toBe(0)
    })
  })

  describe('metrics', () => {
    it('should track processing time correctly', async () => {
      // Mock delayed processing
      aiService.analyzeTicket.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return createMockAnalysis('low')
      })

      // Add test message
      await queue.enqueue({ content: 'Test message' })

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
      const consoleWarn = jest.spyOn(console, 'warn')

      // Mock slow processing
      aiService.analyzeTicket.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
        return createMockAnalysis('low')
      })

      // Add test message
      await queue.enqueue({ content: 'Slow message' })

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
    })
  })

  describe('Critical Alert Handling', () => {
    it('should create critical alert when severity is critical', async () => {
      // Mock critical response
      aiService.analyzeTicket.mockResolvedValueOnce({
        confidence: 0.95,
        metadata: {
          severity: 'critical',
          requiresImmediate: true,
          crisisType: 'suicide_risk',
          responseProtocol: 'immediate_intervention'
        }
      })

      // Add critical message
      await queue.enqueue({ 
        content: 'Critical message',
        metadata: { priority: 'high' }
      })

      // Start monitor
      const monitorPromise = monitor.start()
      await new Promise(resolve => setTimeout(resolve, 50))
      monitor.stop()
      await monitorPromise

      // Verify notification was created
      expect(notificationService.createCriticalAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          requiresImmediate: true,
          crisisType: 'suicide_risk',
          responseProtocol: 'immediate_intervention'
        })
      )
    })

    it('should not create critical alert for non-critical messages', async () => {
      // Mock non-critical response
      aiService.analyzeTicket.mockResolvedValueOnce({
        confidence: 0.8,
        metadata: {
          severity: 'low',
          requiresImmediate: false
        }
      })

      // Add non-critical message
      await queue.enqueue({ 
        content: 'Normal message',
        metadata: { priority: 'low' }
      })

      // Start monitor
      const monitorPromise = monitor.start()
      await new Promise(resolve => setTimeout(resolve, 50))
      monitor.stop()
      await monitorPromise

      // Verify no notification was created
      expect(notificationService.createCriticalAlert).not.toHaveBeenCalled()
    })
  })
}) 
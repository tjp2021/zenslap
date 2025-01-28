import { MessageQueue, Message } from '../message-queue'

describe('MessageQueue', () => {
  let queue: MessageQueue

  beforeEach(() => {
    queue = new MessageQueue({
      maxBatchSize: 5,
      maxLatencyMs: 50,
      processingTimeoutMs: 1000,
      retryAttempts: 2
    })
  })

  describe('enqueue', () => {
    it('should add message to queue with generated id and timestamp', async () => {
      const message = {
        content: 'Test message',
        metadata: { priority: 'high' as const }
      }

      const result = await queue.enqueue(message)

      expect(result.id).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.content).toBe(message.content)
      expect(result.metadata).toEqual(message.metadata)
      expect(queue.getLength()).toBe(1)
    })

    it('should update metrics on successful enqueue', async () => {
      await queue.enqueue({ content: 'Test' })
      
      const metrics = queue.getMetrics()
      expect(metrics.enqueuedCount).toBe(1)
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0)
      expect(metrics.errorCount).toBe(0)
    })
  })

  describe('dequeueUpTo', () => {
    it('should return up to maxBatchSize messages', async () => {
      // Enqueue 7 messages
      for (let i = 0; i < 7; i++) {
        await queue.enqueue({ content: `Message ${i}` })
      }

      const messages = await queue.dequeueUpTo(5)
      expect(messages).toHaveLength(5)
      expect(queue.getLength()).toBe(2)
    })

    it('should return all messages when batch size > queue length', async () => {
      await queue.enqueue({ content: 'Message 1' })
      await queue.enqueue({ content: 'Message 2' })

      const messages = await queue.dequeueUpTo(5)
      expect(messages).toHaveLength(2)
      expect(queue.getLength()).toBe(0)
    })

    it('should update metrics on successful dequeue', async () => {
      await queue.enqueue({ content: 'Test 1' })
      await queue.enqueue({ content: 'Test 2' })
      
      await queue.dequeueUpTo(2)
      
      const metrics = queue.getMetrics()
      expect(metrics.dequeuedCount).toBe(2)
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0)
      expect(metrics.errorCount).toBe(0)
    })
  })

  describe('peek', () => {
    it('should return first message without removing it', async () => {
      const message = { content: 'Test message' }
      await queue.enqueue(message)

      const peeked = await queue.peek()
      expect(peeked?.content).toBe(message.content)
      expect(queue.getLength()).toBe(1)
    })

    it('should return null when queue is empty', async () => {
      const result = await queue.peek()
      expect(result).toBeNull()
    })
  })

  describe('metrics', () => {
    it('should track latency correctly', async () => {
      // Add artificial delay to make latency measurable
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      
      await queue.enqueue({ content: 'Test 1' })
      await delay(10)
      await queue.enqueue({ content: 'Test 2' })
      
      const metrics = queue.getMetrics()
      expect(metrics.maxLatency).toBeGreaterThan(0)
      expect(metrics.averageLatency).toBeGreaterThan(0)
    })

    it('should maintain accurate counts', async () => {
      for (let i = 0; i < 5; i++) {
        await queue.enqueue({ content: `Message ${i}` })
      }
      
      await queue.dequeueUpTo(3)
      await queue.dequeueUpTo(1)
      
      const metrics = queue.getMetrics()
      expect(metrics.enqueuedCount).toBe(5)
      expect(metrics.dequeuedCount).toBe(4)
      expect(queue.getLength()).toBe(1)
    })
  })
}) 
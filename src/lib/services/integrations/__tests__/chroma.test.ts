import { ChromaService, InsightPattern } from '../chroma'
import { ChromaClient, Collection, IncludeEnum } from 'chromadb'

// Mock ChromaDB client
jest.mock('chromadb', () => {
  const mockCollection = {
    upsert: jest.fn(),
    query: jest.fn().mockImplementation((params) => {
      // Create a mock embedding vector with random non-zero values
      const createMockEmbedding = () => new Array(384).fill(0).map(() => Math.random())
      
      if (params.where?.id) {
        // Return the document for ID search
        return {
          ids: [['test_id']],
          documents: [['test content']],
          distances: [[0]],
          embeddings: [[createMockEmbedding()]], // Non-zero embedding vector
          metadatas: [[{
            type: 'ticket',
            timestamp: new Date().toISOString(),
            contentLength: 100,
            validationPassed: true
          }]]
        }
      } else {
        // Return similar documents
        return {
          ids: [['test_id', 'similar_id']],
          documents: [['test content', 'similar content']],
          distances: [[0.1, 0.2]],
          embeddings: [[createMockEmbedding(), createMockEmbedding()]], // Non-zero embedding vectors
          metadatas: [[
            {
              type: 'ticket',
              timestamp: new Date().toISOString(),
              contentLength: 100,
              validationPassed: true
            },
            {
              type: 'ticket',
              timestamp: new Date().toISOString(),
              contentLength: 120,
              validationPassed: true
            }
          ]]
        }
      }
    }),
  }
  
  return {
    ChromaClient: jest.fn().mockImplementation(() => ({
      getOrCreateCollection: jest.fn().mockResolvedValue(mockCollection),
    })),
    Collection: jest.fn(),
    IncludeEnum: {
      Metadatas: 'metadatas',
      Documents: 'documents',
      Distances: 'distances',
      Embeddings: 'embeddings'
    }
  }
})

describe('ChromaService', () => {
  let chromaService: ChromaService
  const testTicketId = 'test_' + Date.now()
  const testContent = 'This is a test ticket with sufficient content length for testing purposes.'

  beforeEach(() => {
    // Reset environment
    process.env.CHROMA_API_TOKEN = 'test-token'
    process.env.CHROMA_API_URL = 'http://test.chroma'
    process.env.CHROMA_TENANT_ID = 'test-tenant'
    process.env.CHROMA_DATABASE = 'test-db'
    
    // Clear all mocks before each test
    jest.clearAllMocks()
    ChromaService['instance'] = null
    chromaService = ChromaService.getInstance()
  })

  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = ChromaService.getInstance()
      const instance2 = ChromaService.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should throw error if CHROMA_API_TOKEN is not set', () => {
      delete process.env.CHROMA_API_TOKEN
      ChromaService['instance'] = null
      expect(() => ChromaService.getInstance()).toThrow('CHROMA_API_TOKEN is not set')
    })
  })

  describe('Content Validation', () => {
    it('should reject empty content', async () => {
      await chromaService.indexTicket('empty_' + Date.now(), '')
      const mockCollection = await (chromaService as any).getCollection()
      expect(mockCollection.upsert).not.toHaveBeenCalled()
    })

    it('should reject very short content', async () => {
      await chromaService.indexTicket('short_' + Date.now(), 'too short')
      const mockCollection = await (chromaService as any).getCollection()
      expect(mockCollection.upsert).not.toHaveBeenCalled()
    })

    it('should reject content with error logs', async () => {
      await chromaService.indexTicket(
        'error_' + Date.now(),
        'Some content with error log: Error: something went wrong'
      )
      const mockCollection = await (chromaService as any).getCollection()
      expect(mockCollection.upsert).not.toHaveBeenCalled()
    })

    it('should accept valid content', async () => {
      await chromaService.indexTicket(testTicketId, testContent)
      const mockCollection = await (chromaService as any).getCollection()
      expect(mockCollection.upsert).toHaveBeenCalledWith(expect.objectContaining({
        ids: [testTicketId],
        documents: [testContent]
      }))
    })
  })

  describe('Pattern Detection', () => {
    it('should handle non-existent ticket', async () => {
      const mockCollection = await (chromaService as any).getCollection()
      mockCollection.query.mockResolvedValueOnce({
        ids: [[]],
        documents: [[]],
        distances: [[]],
        embeddings: [[]],
        metadatas: [[]]
      })

      const patterns = await chromaService.findPatterns('non_existent_ticket')
      expect(patterns).toHaveLength(0)
    })

    it('should find similar tickets', async () => {
      const patterns = await chromaService.findPatterns(testTicketId)
      expect(patterns).toHaveLength(2)
      expect(patterns[0].type).toBe('similar_tickets')
      expect(patterns[0].confidence).toBeGreaterThan(0)
      expect(patterns[0].relatedTickets).toHaveLength(1)
      expect(patterns[0].explanation).toContain('%')
    })

    it('should filter patterns by confidence threshold', async () => {
      const mockCollection = await (chromaService as any).getCollection()
      mockCollection.query.mockImplementationOnce(() => ({
        ids: [['low_confidence_id']],
        documents: [['test content']],
        distances: [[0.9]], // Very low confidence
        embeddings: [[new Array(384).fill(0).map(() => Math.random())]],
        metadatas: [[{ type: 'ticket', validationPassed: true }]]
      }))

      const patterns = await chromaService.findPatterns(testTicketId)
      expect(patterns).toHaveLength(0)
    })
  })

  describe('Bulk Operations', () => {
    const bulkTickets = [
      { id: 'bulk1', content: testContent },
      { id: 'bulk2', content: testContent + ' Additional content.' }
    ]

    it('should handle bulk indexing', async () => {
      await chromaService.bulkIndex(bulkTickets)
      const mockCollection = await (chromaService as any).getCollection()
      expect(mockCollection.upsert).toHaveBeenCalledWith(expect.objectContaining({
        ids: expect.arrayContaining(['bulk1', 'bulk2']),
        documents: expect.arrayContaining([expect.any(String)])
      }))
    })

    it('should skip invalid content in bulk operations', async () => {
      const invalidTickets = [
        { id: 'invalid1', content: '' },
        { id: 'valid1', content: testContent },
        { id: 'invalid2', content: 'too short' }
      ]

      await chromaService.bulkIndex(invalidTickets)
      const mockCollection = await (chromaService as any).getCollection()
      expect(mockCollection.upsert).toHaveBeenCalledWith(expect.objectContaining({
        ids: ['valid1'],
        documents: [testContent]
      }))
    })
  })

  describe('Metrics', () => {
    it('should track successful operations', async () => {
      await chromaService.indexTicket(testTicketId, testContent)
      await chromaService.findPatterns(testTicketId)
      
      const metrics = (chromaService as any).getMetrics()
      expect(metrics.successfulEmbeddings).toBeGreaterThan(0)
      expect(metrics.failedEmbeddings).toBe(0)
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0)
    })

    it('should track failed operations', async () => {
      const mockCollection = await (chromaService as any).getCollection()
      mockCollection.upsert.mockRejectedValueOnce(new Error('Test error'))

      try {
        await chromaService.indexTicket(testTicketId, testContent)
      } catch (error) {
        // Expected error
      }

      const metrics = (chromaService as any).getMetrics()
      expect(metrics.failedEmbeddings).toBeGreaterThan(0)
    })
  })
}) 
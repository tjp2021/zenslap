import { ChromaService } from '../chroma'
import { ChromaClient, Collection } from 'chromadb'

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
        }
      } else {
        // Return similar documents
        return {
          ids: [['test_id', 'similar_id']],
          documents: [['test content', 'similar content']],
          distances: [[0.1, 0.2]],
          embeddings: [[createMockEmbedding(), createMockEmbedding()]], // Non-zero embedding vectors
        }
      }
    }),
  }
  
  return {
    ChromaClient: jest.fn().mockImplementation(() => ({
      getOrCreateCollection: jest.fn().mockResolvedValue(mockCollection),
    })),
    Collection: jest.fn(),
  }
})

describe('ChromaService', () => {
  let chromaService: ChromaService
  const testTicketId = 'test_' + Date.now()
  const testContent = 'This is a test ticket with sufficient content length for testing purposes.'

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    chromaService = ChromaService.getInstance()
  })

  describe('Basic Operations', () => {
    it('should index a ticket', async () => {
      await expect(
        chromaService.indexTicket(testTicketId, testContent)
      ).resolves.not.toThrow()
    })

    it('should find patterns for indexed ticket', async () => {
      const patterns = await chromaService.findPatterns(testTicketId)
      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe('similar_tickets')
      expect(patterns[0].confidence).toBeGreaterThan(0)
      expect(patterns[0].relatedTickets).toContain('test_id')
    })
  })

  describe('Content Validation', () => {
    it('should handle empty content', async () => {
      await chromaService.indexTicket('empty_' + Date.now(), '')
      const mockCollection = await (chromaService as any).client.getOrCreateCollection()
      expect(mockCollection.upsert).not.toHaveBeenCalled()
    })

    it('should handle very short content', async () => {
      await chromaService.indexTicket('short_' + Date.now(), 'too short')
      const mockCollection = await (chromaService as any).client.getOrCreateCollection()
      expect(mockCollection.upsert).not.toHaveBeenCalled()
    })
  })

  describe('Pattern Detection', () => {
    it('should handle non-existent ticket', async () => {
      const mockCollection = await (chromaService as any).client.getOrCreateCollection()
      mockCollection.query.mockResolvedValueOnce({
        ids: [[]],
        documents: [[]],
        distances: [[]],
        embeddings: [[]],
      })

      const patterns = await chromaService.findPatterns('non_existent_ticket')
      expect(patterns).toHaveLength(0)
    })

    it('should find similar tickets', async () => {
      const similarTickets = [
        { id: 'similar_0_' + Date.now(), content: 'Similar content for testing pattern detection' },
        { id: 'similar_1_' + Date.now(), content: 'Another similar content for testing' },
      ]

      await chromaService.indexTicket(similarTickets[0].id, similarTickets[0].content)
      await chromaService.indexTicket(similarTickets[1].id, similarTickets[1].content)

      const patterns = await chromaService.findPatterns(similarTickets[0].id)
      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe('similar_tickets')
      expect(patterns[0].confidence).toBeGreaterThan(0)
      expect(patterns[0].relatedTickets).toContain('test_id')
      expect(patterns[0].relatedTickets).toContain('similar_id')
    })
  })
}) 
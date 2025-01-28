import { ChromaClient, Collection, Embedding, Embeddings, IEmbeddingFunction } from 'chromadb'

export interface InsightPattern {
  id: string
  type: 'similarity' | 'trend' | 'similar_tickets'
  confidence: number
  relatedTickets: string[]
  explanation: string
}

interface ContentValidation {
  isValid: boolean
  reason?: string
}

export class ChromaService {
  private static instance: ChromaService | null = null
  private client: ChromaClient
  private collection: Collection | null = null
  private embeddingFunction: IEmbeddingFunction

  private constructor() {
    this.embeddingFunction = {
      generate: async (texts: string[]): Promise<number[][]> => {
        // Use the default embedding function from chromadb-default-embed
        const { DefaultEmbeddingFunction } = require('chromadb-default-embed')
        const embedder = new DefaultEmbeddingFunction()
        return embedder.generate(texts)
      }
    }
    
    this.client = new ChromaClient({
      path: 'https://api.trychroma.com:8000',
      auth: { 
        provider: 'token', 
        credentials: process.env.CHROMA_API_TOKEN,
        tokenHeaderType: 'X_CHROMA_TOKEN' 
      },
      tenant: process.env.CHROMA_TENANT_ID,
      database: process.env.CHROMA_DATABASE
    })
  }

  public static getInstance(): ChromaService {
    if (!ChromaService.instance) {
      ChromaService.instance = new ChromaService()
    }
    return ChromaService.instance
  }

  private async getCollection() {
    if (!this.collection) {
      this.collection = await this.client.getOrCreateCollection({ 
        name: 'insights',
        metadata: { 
          description: 'Ticket insights and patterns'
        },
        embeddingFunction: this.embeddingFunction
      })
    }
    return this.collection
  }

  private validateContent(content: string): ContentValidation {
    if (!content || content.length < 20) {
      return { isValid: false, reason: 'Content too short (min 20 chars)' }
    }
    if (content.includes('error log:') || content.includes('stack trace:')) {
      return { isValid: false, reason: 'Contains error log or stack trace' }
    }
    if (content.trim().length === 0) {
      return { isValid: false, reason: 'Empty content after trimming' }
    }
    return { isValid: true }
  }

  private async validateEmbedding(embedding: Embedding): Promise<void> {
    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding detected')
    }
    if (embedding.every(val => val === 0)) {
      throw new Error('Zero vector detected')
    }
    // Check for NaN values
    if (embedding.some(val => isNaN(val))) {
      throw new Error('NaN values detected in embedding')
    }
  }

  // Core MVP Functions

  public async indexTicket(ticketId: string, content: string) {
    const validation = this.validateContent(content)
    if (!validation.isValid) {
      console.warn(`Skipping invalid content for ticket ${ticketId}: ${validation.reason}`)
      return
    }

    const collection = await this.getCollection()
    
    try {
      await collection.upsert({
        ids: [ticketId],
        documents: [content],
        metadatas: [{ 
          type: 'ticket', 
          timestamp: new Date().toISOString(),
          contentLength: content.length,
          validationPassed: true
        }]
      })
    } catch (error) {
      console.error(`Failed to index ticket ${ticketId}:`, error)
      throw error
    }
  }

  public async findPatterns(ticketId: string): Promise<InsightPattern[]> {
    const collection = await this.getCollection()
    
    try {
      const ticket = await collection.query({
        queryTexts: [''], // Empty for ID search
        where: { id: ticketId },
        nResults: 1
      })

      if (!ticket.documents?.[0]?.[0]) {
        return []
      }

      const similar = await collection.query({
        queryTexts: [ticket.documents[0][0]],
        nResults: 5,
        where: { validationPassed: true } // Only search validated content
      })

      // Validate embeddings in results
      if (similar.embeddings?.[0]?.[0]) {
        await this.validateEmbedding(similar.embeddings[0][0])
      }

      if (!similar.ids?.[0]?.length) {
        return []
      }

      return [{
        id: ticketId,
        type: 'similar_tickets',
        confidence: 1 - (similar.distances?.[0]?.[0] || 0), // Convert distance to confidence
        relatedTickets: similar.ids[0],
        explanation: 'Found tickets with similar content'
      }]
    } catch (error) {
      console.error(`Failed to find patterns for ticket ${ticketId}:`, error)
      throw error
    }
  }

  // Accuracy Tracking
  public async trackAccuracy(patternId: string, wasHelpful: boolean) {
    // For MVP, just log to console
    // Later we'll store this in Supabase
    console.log('Pattern accuracy:', { patternId, wasHelpful })
  }
} 
'use server'

import { ChromaClient, Collection, Embedding, Embeddings, IEmbeddingFunction, IncludeEnum } from 'chromadb'
import { backOff } from 'exponential-backoff'
import { CrisisType } from '../../../types/ai'

export interface InsightPattern {
  id?: string
  type: 'similarity' | 'trend' | 'similar_tickets' | CrisisType
  confidence: number
  relatedTickets: string[]
  explanation: string
  metadata?: Record<string, unknown>
}

interface ContentValidation {
  isValid: boolean
  reason?: string
  metadata?: {
    contentLength: number
    hasErrorLogs: boolean
    quality: 'high' | 'medium' | 'low'
  }
}

interface ChromaServiceConfig {
  maxRetries: number
  minContentLength: number
  similarityThreshold: number
  maxResults: number
  validationRules: {
    minLength: number
    maxLength: number
    errorPatterns: string[]
  }
}

export class ChromaService {
  private static instance: ChromaService | null = null
  private client: ChromaClient
  private collection: Collection | null = null
  private embeddingFunction: IEmbeddingFunction
  private metrics: {
    successfulEmbeddings: number
    failedEmbeddings: number
    averageLatency: number
    totalRequests: number
  }

  private config: ChromaServiceConfig = {
    maxRetries: 3,
    minContentLength: 20,
    similarityThreshold: 0.7,
    maxResults: 5,
    validationRules: {
      minLength: 20,
      maxLength: 10000,
      errorPatterns: [
        'error log:',
        'stack trace:',
        'exception:',
        'failed:',
        'undefined is not'
      ]
    }
  }

  private constructor() {
    this.metrics = {
      successfulEmbeddings: 0,
      failedEmbeddings: 0,
      averageLatency: 0,
      totalRequests: 0
    }

    this.embeddingFunction = {
      generate: async (texts: string[]): Promise<number[][]> => {
        const startTime = Date.now()
        try {
          const { DefaultEmbeddingFunction } = require('chromadb-default-embed')
          const embedder = new DefaultEmbeddingFunction()
          const embeddings = await embedder.generate(texts)
          
          // Validate embeddings
          embeddings.forEach(this.validateEmbedding)
          
          // Update metrics
          const latency = Date.now() - startTime
          this.updateMetrics('success', latency)
          
          return embeddings
        } catch (error) {
          this.updateMetrics('error', Date.now() - startTime)
          throw error
        }
      }
    }
    
    if (!process.env.CHROMA_API_TOKEN) {
      throw new Error('CHROMA_API_TOKEN is not set')
    }
    
    this.client = new ChromaClient({
      path: process.env.CHROMA_API_URL || 'https://api.trychroma.com:8000',
      auth: { 
        provider: 'token', 
        credentials: process.env.CHROMA_API_TOKEN,
        tokenHeaderType: 'X_CHROMA_TOKEN' 
      },
      tenant: process.env.CHROMA_TENANT_ID,
      database: process.env.CHROMA_DATABASE
    })
  }

  private updateMetrics(status: 'success' | 'error', latency: number): void {
    this.metrics.totalRequests++
    if (status === 'success') {
      this.metrics.successfulEmbeddings++
    } else {
      this.metrics.failedEmbeddings++
    }
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency) /
      this.metrics.totalRequests
    )
  }

  public getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.successfulEmbeddings / this.metrics.totalRequests,
      failureRate: this.metrics.failedEmbeddings / this.metrics.totalRequests
    }
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
          description: 'Ticket insights and patterns',
          version: '1.0',
          created: new Date().toISOString()
        },
        embeddingFunction: this.embeddingFunction
      })
    }
    return this.collection
  }

  private validateContent(content: string): ContentValidation {
    const trimmedContent = content.trim()
    const hasErrorLogs = this.config.validationRules.errorPatterns.some(pattern => 
      content.toLowerCase().includes(pattern)
    )

    if (!trimmedContent) {
      return { 
        isValid: false, 
        reason: 'Empty content after trimming',
        metadata: { contentLength: 0, hasErrorLogs, quality: 'low' }
      }
    }

    if (trimmedContent.length < this.config.validationRules.minLength) {
      return { 
        isValid: false, 
        reason: `Content too short (min ${this.config.validationRules.minLength} chars)`,
        metadata: { contentLength: trimmedContent.length, hasErrorLogs, quality: 'low' }
      }
    }

    if (trimmedContent.length > this.config.validationRules.maxLength) {
      return { 
        isValid: false, 
        reason: `Content too long (max ${this.config.validationRules.maxLength} chars)`,
        metadata: { contentLength: trimmedContent.length, hasErrorLogs, quality: 'low' }
      }
    }

    if (hasErrorLogs) {
      return { 
        isValid: false, 
        reason: 'Contains error logs or stack traces',
        metadata: { contentLength: trimmedContent.length, hasErrorLogs, quality: 'low' }
      }
    }

    return { 
      isValid: true,
      metadata: { 
        contentLength: trimmedContent.length, 
        hasErrorLogs: false,
        quality: trimmedContent.length > 100 ? 'high' : 'medium'
      }
    }
  }

  private validateEmbedding(embedding: Embedding): void {
    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding detected')
    }
    if (embedding.every(val => val === 0)) {
      throw new Error('Zero vector detected')
    }
    if (embedding.some(val => isNaN(val))) {
      throw new Error('NaN values detected in embedding')
    }
    // Check for reasonable magnitude
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (magnitude < 0.1 || magnitude > 100) {
      throw new Error(`Unusual embedding magnitude: ${magnitude}`)
    }
  }

  public async indexTicket(ticketId: string, content: string): Promise<void> {
    const validation = this.validateContent(content)
    if (!validation.isValid) {
      console.warn(`Skipping invalid content for ticket ${ticketId}:`, {
        reason: validation.reason,
        metadata: validation.metadata
      })
      return
    }

    const operation = async () => {
      const collection = await this.getCollection()
      await collection.upsert({
        ids: [ticketId],
        documents: [content],
        metadatas: [{
          type: 'ticket',
          timestamp: new Date().toISOString(),
          ...validation.metadata,
          validationPassed: true
        }]
      })
    }

    try {
      await backOff(operation, {
        numOfAttempts: this.config.maxRetries,
        startingDelay: 1000,
        maxDelay: 5000,
        retry: (error: any) => {
          console.warn(`Retry indexing ticket ${ticketId}:`, error)
          return true
        }
      })
    } catch (error) {
      console.error(`Failed to index ticket ${ticketId} after ${this.config.maxRetries} attempts:`, error)
      throw error
    }
  }

  public async findPatterns(ticketId: string): Promise<InsightPattern[]> {
    const collection = await this.getCollection()
    
    try {
      // First, get the source ticket
      const ticket = await collection.query({
        queryTexts: [''],
        where: { id: ticketId },
        nResults: 1,
        include: [IncludeEnum.Metadatas, IncludeEnum.Documents, IncludeEnum.Distances]
      })

      if (!ticket.documents?.[0]?.[0]) {
        console.warn(`No ticket found with ID ${ticketId}`)
        return []
      }

      // Find similar tickets
      const similar = await collection.query({
        queryTexts: [ticket.documents[0][0]],
        nResults: this.config.maxResults,
        where: { validationPassed: true },
        include: [IncludeEnum.Metadatas, IncludeEnum.Documents, IncludeEnum.Distances]
      })

      if (similar.embeddings?.[0]?.[0]) {
        await this.validateEmbedding(similar.embeddings[0][0])
      }

      if (!similar.ids?.[0]?.length) {
        return []
      }

      // Process and return patterns
      return similar.ids[0].map((id, index) => ({
        id: `${ticketId}_pattern_${index}`,
        type: 'similar_tickets' as const,
        confidence: Math.max(0, 1 - (similar.distances?.[0]?.[index] || 0)),
        relatedTickets: [id],
        explanation: `Found ticket with ${Math.round((1 - (similar.distances?.[0]?.[index] || 0)) * 100)}% similarity`,
        metadata: similar.metadatas?.[0]?.[index] || undefined
      })).filter(pattern => pattern.confidence >= this.config.similarityThreshold)
    } catch (error) {
      console.error(`Failed to find patterns for ticket ${ticketId}:`, error)
      throw error
    }
  }

  public async bulkIndex(tickets: Array<{ id: string, content: string }>) {
    const validTickets = tickets.filter(ticket => {
      const validation = this.validateContent(ticket.content)
      if (!validation.isValid) {
        console.warn(`Skipping invalid content for ticket ${ticket.id}:`, {
          reason: validation.reason,
          metadata: validation.metadata
        })
        return false
      }
      return true
    })

    const batchSize = 100
    for (let i = 0; i < validTickets.length; i += batchSize) {
      const batch = validTickets.slice(i, i + batchSize)
      try {
        await this.indexBatch(batch)
        console.log(`Indexed batch ${i / batchSize + 1}/${Math.ceil(validTickets.length / batchSize)}`)
      } catch (error) {
        console.error(`Failed to index batch ${i / batchSize + 1}:`, error)
        throw error
      }
    }
  }

  private async indexBatch(tickets: Array<{ id: string, content: string }>) {
    const collection = await this.getCollection()
    
    const operation = async () => {
      await collection.upsert({
        ids: tickets.map(t => t.id),
        documents: tickets.map(t => t.content),
        metadatas: tickets.map(t => ({
          type: 'ticket',
          timestamp: new Date().toISOString(),
          ...this.validateContent(t.content).metadata,
          validationPassed: true
        }))
      })
    }

    try {
      await backOff(operation, {
        numOfAttempts: this.config.maxRetries,
        startingDelay: 1000,
        maxDelay: 5000
      })
    } catch (error) {
      console.error('Failed to index batch:', error)
      throw error
    }
  }
} 
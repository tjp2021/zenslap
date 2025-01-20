import { NextApiRequest, NextApiResponse } from 'next'
import type { TicketBase, CreateTicketDTO, UpdateTicketDTO } from './types'

interface MockRouterConfig {
	method?: string
	query?: Record<string, string>
	body?: unknown
}

export function createMockRouter(config: MockRouterConfig = {}) {
	const mockReq = {
		method: config.method || 'GET',
		query: config.query || {},
		body: config.body,
	} as NextApiRequest

	const mockRes = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		end: jest.fn().mockReturnThis(),
		setHeader: jest.fn().mockReturnThis(),
	} as unknown as NextApiResponse

	return { req: mockReq, res: mockRes }
}

// Mock data generators
export const createMockTicket = (overrides: Partial<TicketBase> = {}): TicketBase => ({
	id: '123',
	title: 'Test Ticket',
	description: 'Test Description',
	status: 'open',
	priority: 'medium',
	metadata: {},
	created_at: '2025-01-20T21:05:10.183Z',
	updated_at: '2025-01-20T21:05:10.183Z',
	...overrides
})

export const createMockTicketDTO = (overrides?: Partial<CreateTicketDTO>): CreateTicketDTO => ({
	title: 'Test Ticket',
	description: 'Test Description',
	status: 'open',
	priority: 'medium',
	metadata: {},
	...overrides
})

export const createMockUpdateTicketDTO = (id: string, overrides?: Partial<Omit<UpdateTicketDTO, 'id'>>): UpdateTicketDTO => ({
	id,
	title: 'Updated Ticket',
	description: 'Updated Description',
	status: 'in_progress',
	priority: 'high',
	metadata: { updated: true },
	...overrides
})

// Supabase mock helpers
export const createMockSupabaseResponse = <T>(data: T | null = null, error: Error | null = null) => ({
	data,
	error,
	count: null
})

// Test assertion helpers
export const expectSuccessResponse = <T>(
	result: { data: T | null; error: string | null },
	expectedData: T
) => {
	expect(result.data).toEqual(expectedData)
	expect(result.error).toBeNull()
}

export const expectErrorResponse = (
	result: { data: unknown | null; error: string | null },
	expectedError: string
) => {
	expect(result.data).toBeNull()
	expect(result.error).toBe(expectedError)
} 
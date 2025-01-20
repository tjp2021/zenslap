import { NextApiRequest, NextApiResponse } from 'next'

export function createMockRouter() {
	const mockReq = {
		body: {},
		query: {}
	} as unknown as NextApiRequest

	const mockRes = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn()
	} as unknown as NextApiResponse

	return { req: mockReq, res: mockRes }
} 
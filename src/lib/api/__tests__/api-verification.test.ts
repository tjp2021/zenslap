import { tags } from '../routes/tags'
import { internalNotes } from '../routes/internal-notes'
import { messages } from '../routes/messages'
import { createMockSupabaseClient } from '@/lib/context/__tests__/test-utils'

const TEST_UUID = '123e4567-e89b-12d3-a456-426614174000'
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174001'

describe('API Verification', () => {
    let mockSupabase: any

    beforeEach(() => {
        mockSupabase = createMockSupabaseClient({
            select: { data: [], error: null },
            insert: { data: null, error: null },
            update: { data: null, error: null },
            delete: { data: null, error: null }
        })
    })

    describe('Tags API', () => {
        it('should complete full CRUD cycle', async () => {
            // Create
            mockSupabase.mockMethods.insert.mockResolvedValueOnce({
                data: { id: TEST_UUID, name: 'Test Tag', color: '#FF0000', created_at: new Date().toISOString() },
                error: null
            })

            const createResult = await tags.create({
                name: 'Test Tag',
                color: '#FF0000'
            }, mockSupabase)

            expect(createResult.error).toBeNull()
            expect(createResult.data?.name).toBe('Test Tag')

            // Get All
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: [createResult.data],
                error: null
            })

            const getAllResult = await tags.getAll(mockSupabase)
            expect(getAllResult.error).toBeNull()
            expect(getAllResult.data?.length).toBe(1)

            // Update
            mockSupabase.mockMethods.update.mockResolvedValueOnce({
                data: { ...createResult.data, name: 'Updated Tag' },
                error: null
            })

            const updateResult = await tags.update(TEST_UUID, {
                name: 'Updated Tag'
            }, mockSupabase)

            expect(updateResult.error).toBeNull()
            expect(updateResult.data?.name).toBe('Updated Tag')

            // Delete
            mockSupabase.mockMethods.delete.mockResolvedValueOnce({
                data: null,
                error: null
            })

            const deleteResult = await tags.delete(TEST_UUID, mockSupabase)
            expect(deleteResult.error).toBeNull()
            expect(deleteResult.data?.success).toBe(true)
        })
    })

    describe('Internal Notes API', () => {
        it('should complete full CRUD cycle', async () => {
            // Create
            mockSupabase.mockMethods.insert.mockResolvedValueOnce({
                data: {
                    id: TEST_UUID,
                    ticket_id: TEST_UUID,
                    content: 'Test Note',
                    created_by: TEST_USER_ID,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                error: null
            })

            const createResult = await internalNotes.create({
                ticket_id: TEST_UUID,
                content: 'Test Note'
            }, TEST_USER_ID, mockSupabase)

            expect(createResult.error).toBeNull()
            expect(createResult.data?.content).toBe('Test Note')

            // Get By Ticket
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: [createResult.data],
                error: null
            })

            const getResult = await internalNotes.getByTicketId(TEST_UUID, mockSupabase)
            expect(getResult.error).toBeNull()
            expect(getResult.data?.length).toBe(1)

            // Update
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: { created_by: TEST_USER_ID },
                error: null
            })
            mockSupabase.mockMethods.update.mockResolvedValueOnce({
                data: { ...createResult.data, content: 'Updated Note' },
                error: null
            })

            const updateResult = await internalNotes.update(
                TEST_UUID,
                'Updated Note',
                TEST_USER_ID,
                mockSupabase
            )

            expect(updateResult.error).toBeNull()
            expect(updateResult.data?.content).toBe('Updated Note')

            // Delete
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: { created_by: TEST_USER_ID },
                error: null
            })
            mockSupabase.mockMethods.delete.mockResolvedValueOnce({
                data: null,
                error: null
            })

            const deleteResult = await internalNotes.delete(TEST_UUID, TEST_USER_ID, mockSupabase)
            expect(deleteResult.error).toBeNull()
            expect(deleteResult.data?.success).toBe(true)
        })
    })

    describe('Messages API', () => {
        it('should complete full CRUD cycle', async () => {
            // Create
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: { id: TEST_UUID },
                error: null
            })
            mockSupabase.mockMethods.insert.mockResolvedValueOnce({
                data: {
                    id: TEST_UUID,
                    ticket_id: TEST_UUID,
                    content: 'Test Message',
                    type: 'agent',
                    created_by: TEST_USER_ID,
                    created_at: new Date().toISOString()
                },
                error: null
            })

            const createResult = await messages.create({
                ticket_id: TEST_UUID,
                content: 'Test Message',
                type: 'agent'
            }, TEST_USER_ID, mockSupabase)

            expect(createResult.error).toBeNull()
            expect(createResult.data?.content).toBe('Test Message')

            // Get By Ticket
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: [createResult.data],
                error: null
            })

            const getResult = await messages.getByTicketId(TEST_UUID, mockSupabase)
            expect(getResult.error).toBeNull()
            expect(getResult.data?.length).toBe(1)

            // Update
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: { created_by: TEST_USER_ID, type: 'agent' },
                error: null
            })
            mockSupabase.mockMethods.auth.getUser.mockResolvedValueOnce({
                data: { user: { user_metadata: { role: 'AGENT' } } }
            })
            mockSupabase.mockMethods.update.mockResolvedValueOnce({
                data: { ...createResult.data, content: 'Updated Message' },
                error: null
            })

            const updateResult = await messages.update(
                TEST_UUID,
                'Updated Message',
                TEST_USER_ID,
                mockSupabase
            )

            expect(updateResult.error).toBeNull()
            expect(updateResult.data?.content).toBe('Updated Message')

            // Delete
            mockSupabase.mockMethods.select.mockResolvedValueOnce({
                data: { created_by: TEST_USER_ID, type: 'agent' },
                error: null
            })
            mockSupabase.mockMethods.auth.getUser.mockResolvedValueOnce({
                data: { user: { user_metadata: { role: 'AGENT' } } }
            })
            mockSupabase.mockMethods.delete.mockResolvedValueOnce({
                data: null,
                error: null
            })

            const deleteResult = await messages.delete(TEST_UUID, TEST_USER_ID, mockSupabase)
            expect(deleteResult.error).toBeNull()
            expect(deleteResult.data?.success).toBe(true)
        })
    })
}) 
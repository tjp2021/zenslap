import { SupabaseClient } from '@supabase/supabase-js'

type MockMethods = {
    select: jest.Mock
    insert: jest.Mock
    update: jest.Mock
    delete: jest.Mock
    auth: {
        getUser: jest.Mock
    }
}

export const createMockSupabaseClient = (defaultResponses: {
    select?: { data: any; error: any }
    insert?: { data: any; error: any }
    update?: { data: any; error: any }
    delete?: { data: any; error: any }
}) => {
    const mockMethods: MockMethods = {
        select: jest.fn().mockResolvedValue(defaultResponses.select),
        insert: jest.fn().mockResolvedValue(defaultResponses.insert),
        update: jest.fn().mockResolvedValue(defaultResponses.update),
        delete: jest.fn().mockResolvedValue(defaultResponses.delete),
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: null, error: null })
        }
    }

    const mockClient = {
        from: () => ({
            select: (...args: any[]) => ({
                eq: (...args: any[]) => ({
                    single: () => mockMethods.select(),
                    order: () => mockMethods.select(),
                    ...mockMethods
                }),
                order: () => mockMethods.select(),
                ...mockMethods
            }),
            insert: (...args: any[]) => ({
                select: () => ({
                    single: () => mockMethods.insert()
                })
            }),
            update: (...args: any[]) => ({
                eq: () => ({
                    select: () => ({
                        single: () => mockMethods.update()
                    })
                })
            }),
            delete: (...args: any[]) => ({
                eq: () => mockMethods.delete()
            })
        }),
        auth: {
            getUser: mockMethods.auth.getUser
        }
    } as unknown as SupabaseClient

    return {
        ...mockClient,
        mockMethods
    }
} 
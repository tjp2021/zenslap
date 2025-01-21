import { render, screen, fireEvent } from '@testing-library/react'
import { QuickResponseSelector } from '../QuickResponseSelector'
import { useCategories, useResponses } from '@/lib/hooks/useQuickResponses'
import { mockSupabaseClient } from '@/test/mocks/supabase'

// Mock the hooks
jest.mock('@/lib/hooks/useQuickResponses', () => ({
  useCategories: jest.fn(),
  useResponses: jest.fn()
}))

const mockCategories = [
  { id: '1', name: 'Greetings', created_at: new Date().toISOString(), created_by: 'user-1' },
  { id: '2', name: 'Follow-ups', created_at: new Date().toISOString(), created_by: 'user-1' }
]

const mockResponses = [
  { 
    id: '1', 
    title: 'Hello', 
    content: 'Hello {name}!',
    category_id: '1',
    created_at: new Date().toISOString(),
    created_by: 'user-1',
    variables: ['name']
  },
  { 
    id: '2', 
    title: 'Goodbye', 
    content: 'Goodbye {name}!',
    category_id: '1',
    created_at: new Date().toISOString(),
    created_by: 'user-1',
    variables: ['name']
  }
]

describe('QuickResponseSelector', () => {
  const onSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup Supabase mock responses
    const categoriesSelect = jest.fn().mockResolvedValue({ data: mockCategories, error: null })
    const responsesSelect = jest.fn().mockResolvedValue({ data: mockResponses, error: null })
    
    mockSupabaseClient.from.mockImplementation((table: string) => ({
      select: table === 'response_categories' ? categoriesSelect : responsesSelect,
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      order: jest.fn(),
    }))

    // Setup hook mock responses
    ;(useCategories as jest.Mock).mockReturnValue({ 
      data: mockCategories, 
      isLoading: false 
    })
    ;(useResponses as jest.Mock).mockReturnValue({ 
      data: mockResponses, 
      isLoading: false 
    })
  })

  it('renders loading state when fetching categories', () => {
    ;(useCategories as jest.Mock).mockReturnValue({ isLoading: true })
    render(<QuickResponseSelector onSelect={onSelect} />)
    expect(screen.getByText('Loading categories...')).toBeInTheDocument()
  })

  it('renders categories in select dropdown', () => {
    render(<QuickResponseSelector onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox'))
    mockCategories.forEach(category => {
      expect(screen.getByText(category.name)).toBeInTheDocument()
    })
  })

  it('shows loading state when fetching responses', () => {
    render(<QuickResponseSelector onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByText('Loading responses...')).toBeInTheDocument()
  })

  it('displays responses when category is selected', () => {
    render(<QuickResponseSelector onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText(mockCategories[0].name))
    mockResponses.forEach(response => {
      expect(screen.getByText(response.title)).toBeInTheDocument()
    })
  })

  it('calls onSelect with response content when clicked', () => {
    render(<QuickResponseSelector onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText(mockCategories[0].name))
    fireEvent.click(screen.getByText(mockResponses[0].title))
    expect(onSelect).toHaveBeenCalledWith(mockResponses[0].content)
  })
}) 
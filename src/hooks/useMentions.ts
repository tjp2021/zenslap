'use client'

import { useCallback, useReducer } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface MentionState {
  query: string
  isActive: boolean
  isLoading: boolean
  users: Array<{
    id: string
    email: string
    role: string
  }>
}

type MentionAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_ACTIVE'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USERS'; payload: MentionState['users'] }
  | { type: 'RESET' }

const initialState: MentionState = {
  query: '',
  isActive: false,
  isLoading: false,
  users: []
}

function mentionReducer(state: MentionState, action: MentionAction): MentionState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload }
    case 'SET_ACTIVE':
      return { ...state, isActive: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_USERS':
      return { ...state, users: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

interface UseMentionsOptions {
  onSelect?: (user: { id: string; email: string; role: string }) => void
}

export function useMentions(options: UseMentionsOptions = {}) {
  const supabase = createClientComponentClient<Database>()
  const [state, dispatch] = useReducer(mentionReducer, initialState)

  const searchUsers = useCallback(async (query: string) => {
    if (!query) {
      dispatch({ type: 'SET_USERS', payload: [] })
      return
    }

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const { data: users, error } = await supabase
        .from('users_secure')
        .select('id, email, role')
        .ilike('email', `%${query}%`)
        .limit(5)

      if (error) throw error

      dispatch({ type: 'SET_USERS', payload: users || [] })
    } catch (error) {
      console.error('Error searching users:', error)
      dispatch({ type: 'SET_USERS', payload: [] })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [supabase])

  const handleQueryChange = useCallback((query: string) => {
    dispatch({ type: 'SET_QUERY', payload: query })
    searchUsers(query)
  }, [searchUsers])

  const handleSelect = useCallback((user: { id: string; email: string; role: string }) => {
    options.onSelect?.(user)
    dispatch({ type: 'RESET' })
  }, [options])

  return {
    query: state.query,
    isActive: state.isActive,
    isLoading: state.isLoading,
    users: state.users,
    setQuery: handleQueryChange,
    setActive: (active: boolean) => dispatch({ type: 'SET_ACTIVE', payload: active }),
    handleSelect
  }
} 
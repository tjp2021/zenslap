'use client'

import { useCallback, useReducer, useRef, useMemo } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { MentionData } from '@/lib/types/activities'
import { useStaffUsers } from '@/hooks/useStaffUsers'
import { UserRole } from '@/lib/types'

interface MentionState {
  isActive: boolean
  searchTerm: string
  selectedIndex: number
  startPosition: number
}

type MentionAction =
  | { type: 'START_MENTION'; position: number }
  | { type: 'UPDATE_SEARCH'; term: string }
  | { type: 'SELECT_NEXT' }
  | { type: 'SELECT_PREV' }
  | { type: 'RESET' }
  | { type: 'SET_INDEX'; index: number }

const initialState: MentionState = {
  isActive: false,
  searchTerm: '',
  selectedIndex: 0,
  startPosition: 0
}

function mentionReducer(state: MentionState, action: MentionAction): MentionState {
  switch (action.type) {
    case 'START_MENTION':
      return {
        ...state,
        isActive: true,
        startPosition: action.position,
        searchTerm: '',
        selectedIndex: 0
      }
    case 'UPDATE_SEARCH':
      return {
        ...state,
        searchTerm: action.term,
        selectedIndex: 0
      }
    case 'SELECT_NEXT':
      return {
        ...state,
        selectedIndex: state.selectedIndex + 1
      }
    case 'SELECT_PREV':
      return {
        ...state,
        selectedIndex: Math.max(0, state.selectedIndex - 1)
      }
    case 'RESET':
      return initialState
    case 'SET_INDEX':
      return {
        ...state,
        selectedIndex: action.index
      }
    default:
      return state
  }
}

interface StaffUser {
  id: string
  email: string
  role: UserRole
}

interface UseMentionsOptions {
  onMention?: (mention: MentionData) => void
  maxSuggestions?: number
}

export function useMentions(options: UseMentionsOptions = {}) {
  const { maxSuggestions = 10 } = options
  const [state, dispatch] = useReducer(mentionReducer, initialState)
  const { users: staffUsers, isLoading } = useStaffUsers()
  
  // Memoize staff users to prevent unnecessary re-renders
  const memoizedStaffUsers = useMemo(() => staffUsers || [], [staffUsers])
  
  // Filter staff users based on search term - memoized to prevent recalculation
  const suggestions = useMemo(() => {
    if (!state.searchTerm) return []
    
    return memoizedStaffUsers
      .filter(user => 
        user.email.toLowerCase().includes(state.searchTerm.toLowerCase())
      )
      .slice(0, maxSuggestions)
  }, [state.searchTerm, memoizedStaffUsers, maxSuggestions])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!state.isActive) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        dispatch({ type: 'SELECT_NEXT' })
        break
      case 'ArrowUp':
        event.preventDefault()
        dispatch({ type: 'SELECT_PREV' })
        break
      case 'Escape':
        event.preventDefault()
        dispatch({ type: 'RESET' })
        break
      case 'Enter':
      case 'Tab':
        if (state.isActive) {
          event.preventDefault()
          const filtered = suggestions
          if (filtered[state.selectedIndex]) {
            options.onMention?.({
              id: crypto.randomUUID(),
              type: 'user',
              referenced_id: filtered[state.selectedIndex].id
            })
            dispatch({ type: 'RESET' })
          }
        }
        break
    }
  }, [state, suggestions, options])

  const handleInput = useCallback((text: string, cursorPosition: number) => {
    const beforeCursor = text.slice(0, cursorPosition)
    const lastAtSymbol = beforeCursor.lastIndexOf('@')
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = beforeCursor.slice(lastAtSymbol + 1)
      if (!textAfterAt.includes(' ')) {
        dispatch({ type: 'START_MENTION', position: lastAtSymbol })
        dispatch({ type: 'UPDATE_SEARCH', term: textAfterAt })
        return
      }
    }
    
    if (state.isActive) {
      const currentMention = text.slice(state.startPosition, cursorPosition)
      if (currentMention.includes(' ')) {
        dispatch({ type: 'RESET' })
      } else {
        dispatch({ type: 'UPDATE_SEARCH', term: currentMention.slice(1) })
      }
    }
  }, [state])

  const handleSelect = useCallback((user: StaffUser) => {
    options.onMention?.({
      id: crypto.randomUUID(),
      type: 'user',
      referenced_id: user.id
    })
    dispatch({ type: 'RESET' })
  }, [options])

  return {
    isActive: state.isActive,
    searchTerm: state.searchTerm,
    selectedIndex: state.selectedIndex,
    suggestions,
    isLoading,
    handlers: {
      onKeyDown: handleKeyDown,
      onInput: handleInput,
      onSelect: handleSelect
    }
  }
} 
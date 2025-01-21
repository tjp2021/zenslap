import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories,
  getResponses,
  createCategory,
  createResponse,
  updateResponse,
  deleteResponse,
} from '@/lib/api/quick-responses'
import type {
  CreateResponseCategoryData,
  CreateQuickResponseData,
  UpdateQuickResponseData,
} from '@/lib/types/quick-responses'

// Query keys
const CATEGORIES_KEY = ['response-categories']
const RESPONSES_KEY = ['quick-responses']

// Categories hooks
export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: getCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}

// Quick responses hooks
export function useResponses(categoryId?: string) {
  return useQuery({
    queryKey: [...RESPONSES_KEY, categoryId],
    queryFn: () => getResponses(categoryId),
  })
}

export function useCreateResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createResponse,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...RESPONSES_KEY, variables.category_id],
      })
    },
  })
}

export function useUpdateResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateResponse,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...RESPONSES_KEY, variables.category_id],
      })
    },
  })
}

export function useDeleteResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESPONSES_KEY })
    },
  })
} 
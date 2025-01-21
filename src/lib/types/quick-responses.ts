export interface ResponseCategory {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string
}

export interface QuickResponse {
  id: string
  category_id: string
  title: string
  content: string
  variables: string[]
  created_at: string
  updated_at: string
  created_by: string
}

export interface CreateResponseCategoryData {
  name: string
  description?: string | null
}

export interface CreateQuickResponseData {
  category_id: string
  title: string
  content: string
  variables: string[]
}

export interface UpdateQuickResponseData extends Partial<CreateQuickResponseData> {
  id: string
} 
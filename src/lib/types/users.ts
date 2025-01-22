// User role enum
export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  USER = 'user'
}

// Base user interface
export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

// User metadata types
export interface UserMetadata {
  role: UserRole
  provider?: string
  providers?: string[]
}

// Create user DTO
export interface CreateUserDTO {
  email: string
  password: string
  role?: UserRole
}

// Update user DTO
export interface UpdateUserDTO {
  email?: string
  password?: string
  role?: UserRole
} 
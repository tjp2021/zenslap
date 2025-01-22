import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

async function seedTestUser() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123',
    options: {
      data: {
        role: 'admin'
      }
    }
  })

  if (error) {
    console.error('Error creating test user:', error)
    return
  }

  console.log('Test user created:', data)
}

seedTestUser() 
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://shoheafnpjmuqsiwstpp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNob2hlYWZucGptdXFzaXdzdHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDIyOTcsImV4cCI6MjA1Mjk3ODI5N30.towAjh_b2tDDLdFFOKUzZl09uRYe0acLyTs_RwTUmSg'
)

async function seedTestUser() {
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
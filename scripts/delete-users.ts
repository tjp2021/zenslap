import { createClient } from '@supabase/supabase-js'

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNob2hlYWZucGptdXFzaXdzdHBwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQwMjI5NywiZXhwIjoyMDUyOTc4Mjk3fQ.Wd_hPZ5oYxhYZPHzAFQnEF7uNz4LQB7PCiDRvb0Wnp4'

const supabase = createClient(
  'https://shoheafnpjmuqsiwstpp.supabase.co',
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function deleteAllUsers() {
  try {
    // First delete all profiles
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .neq('id', 'dummy') // Delete all rows

    if (profilesError) throw profilesError

    // Then delete all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) throw deleteError
      console.log(`Deleted user: ${user.email}`)
    }

    console.log('Successfully deleted all users')
  } catch (error) {
    console.error('Error deleting users:', error)
  }
}

deleteAllUsers() 
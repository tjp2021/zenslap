import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

async function deleteUsers() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  
  try {
    // Get all users to delete
    const { data: users, error: fetchError } = await supabase
      .from('users_secure')
      .select('id')
      .eq('status', 'pending_deletion')

    if (fetchError) throw fetchError

    // Delete users in batches
    const batchSize = 10
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      const { error: deleteError } = await supabase
        .from('users_secure')
        .delete()
        .in('id', batch.map(u => u.id))

      if (deleteError) throw deleteError
      console.log(`Deleted batch ${i / batchSize + 1}`)
    }

    console.log('Successfully deleted all pending users')
  } catch (error) {
    console.error('Error deleting users:', error)
  }
}

deleteUsers() 
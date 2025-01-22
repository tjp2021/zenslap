'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export function SignOutButton() {
  const supabase = createClientComponentClient<Database>()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-medium text-gray-700 hover:text-gray-800"
    >
      Sign out
    </button>
  )
} 
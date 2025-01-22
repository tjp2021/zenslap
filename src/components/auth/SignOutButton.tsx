'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleSignOut}
      className="text-muted-foreground hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only">Sign out</span>
    </Button>
  )
} 
'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { UserRole } from '@/lib/types'

interface DiagnosticResult {
  step: string
  success: boolean
  data?: any
  error?: any
}

export async function diagnoseStaffUsers() {
  const results: DiagnosticResult[] = []
  const supabase = createClientComponentClient()

  // Step 1: Check current session
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    results.push({
      step: 'Session Check',
      success: !!session && !sessionError,
      data: {
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userRole: session?.user?.user_metadata?.role,
        claims: session?.user?.app_metadata,
      },
      error: sessionError
    })

    if (!session) throw new Error('No session found')

    // Step 2: Check RLS Policies
    const { data: policies, error: policiesError } = await supabase
      .from('users_secure')
      .select('*')
      .limit(1)
    
    results.push({
      step: 'RLS Policy Check',
      success: !policiesError,
      data: { hasAccess: !!policies },
      error: policiesError
    })

    // Step 3: Query Staff Users
    const { data: staffUsers, error: staffError } = await supabase
      .from('users_secure')
      .select('id, email, role')
      .in('role', [UserRole.ADMIN, UserRole.AGENT])

    results.push({
      step: 'Staff Users Query',
      success: !staffError,
      data: {
        count: staffUsers?.length || 0,
        users: staffUsers
      },
      error: staffError
    })

    // Step 4: Verify Role Mapping
    const { data: roleCheck, error: roleError } = await supabase
      .rpc('check_user_role')

    results.push({
      step: 'Role Check Function',
      success: !roleError,
      data: { hasStaffRole: roleCheck },
      error: roleError
    })

  } catch (error) {
    results.push({
      step: 'Diagnostic Error',
      success: false,
      error
    })
  }

  // Log results
  console.group('🔍 Staff Users Diagnostic Results')
  results.forEach(result => {
    console.group(`Step: ${result.step}`)
    console.log('Success:', result.success)
    if (result.data) console.log('Data:', result.data)
    if (result.error) console.log('Error:', result.error)
    console.groupEnd()
  })
  console.groupEnd()

  return results
} 
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data, error } = await supabase
      .from('users_secure')
      .select('id, email, role')
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log('\nUser Roles:')
    data.forEach(user => {
      console.log(`- ${user.email}: ${user.role} (${user.id})`)
    })
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

main() 
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function seedUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials in .env.local')
  }

  // Create admin client with service role key
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

  // Create admin user
  const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
    email: 'admin6@example.com',
    password: 'password123',
    email_confirm: true,
    app_metadata: { role: 'admin' }
  })

  if (adminError) {
    console.error('Error creating admin user:', adminError)
  } else {
    console.log('Admin user created:', adminData)
  }

  // Create agent user
  const { data: agentData, error: agentError } = await supabase.auth.admin.createUser({
    email: 'agent5@example.com',
    password: 'password123',
    email_confirm: true,
    app_metadata: { role: 'agent' }
  })

  if (agentError) {
    console.error('Error creating agent user:', agentError)
  } else {
    console.log('Agent user created:', agentData)
  }
}

seedUsers().catch(console.error) 
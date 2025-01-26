const { createClient } = require('@supabase/supabase-js')
const { createSchemaValidator } = require('../src/lib/schema/validation')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
  console.log('Starting schema validation script...')
  
  // Ensure required environment variables are present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  const missingVars = []
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missingVars.length > 0) {
    console.error('\nMissing required environment variables:')
    missingVars.forEach(v => console.error(`- ${v}`))
    console.error('\nPlease add these to your .env.local file')
    process.exit(1)
  }

  // At this point TypeScript knows these are defined
  const validatedUrl = supabaseUrl as string
  const validatedKey = supabaseServiceKey as string

  // Validate URL format
  try {
    new URL(validatedUrl)
  } catch (error) {
    console.error('\nInvalid NEXT_PUBLIC_SUPABASE_URL format:', validatedUrl)
    console.error('Please ensure this is a valid URL')
    process.exit(1)
  }

  // Validate service key format
  if (!validatedKey.startsWith('eyJ') || validatedKey.length < 100) {
    console.error('\nInvalid SUPABASE_SERVICE_ROLE_KEY format')
    console.error('Please ensure you are using the service role key, not the anon key')
    console.error('You can find this in your Supabase dashboard under Project Settings > API')
    process.exit(1)
  }

  console.log('Environment variables validated')
  console.log('Connecting to Supabase...')

  // Create Supabase client with service role key
  const supabase = createClient(validatedUrl, validatedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Create schema validator
  const validator = createSchemaValidator(supabase)

  try {
    // Test connection
    console.log('Testing database connection...')
    const { error: connectionError } = await supabase.from('tickets').select('id').limit(1)
    if (connectionError) {
      throw new Error(`Connection test failed: ${connectionError.message}`)
    }
    console.log('Database connection successful')

    // Validate schema
    await validator.validateSchema()
    console.log('\n✅ Schema validation successful!')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Schema validation failed:')
    if (err instanceof Error) {
      console.error(err.message)
    } else {
      console.error('An unknown error occurred:', err)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\n❌ Unhandled error:')
  if (err instanceof Error) {
    console.error(err.message)
  } else {
    console.error('An unknown error occurred:', err)
  }
  process.exit(1)
}) 
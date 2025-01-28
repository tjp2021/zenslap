import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { AIService } from '../src/lib/services/integrations/ai.service'
import type { Database } from '../types/supabase'

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

async function main() {
  // Initialize Supabase client
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Initialize AI service
  const aiService = AIService.getInstance(supabase)

  // Test ticket content
  const testTicket = `
User is experiencing issues with Google OAuth login.
Error message: "redirect_uri_mismatch"
Impact: Unable to access dashboard
Attempted Solutions:
- Cleared browser cache
- Tried different browser
- Verified Google OAuth settings
`

  try {
    console.log('Testing AI Service...\n')

    // Test sentiment analysis
    console.log('1. Testing Sentiment Analysis...')
    try {
      const sentiment = await aiService.analyzeTicket(
        'test-1',
        'sentiment',
        testTicket
      )
      console.log('Sentiment Result:', sentiment)
    } catch (error: any) {
      console.error('Sentiment Analysis Error:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        details: error?.response?.data || error
      })
      throw new Error(`Test failed: ${error?.message || JSON.stringify(error)}`)
    }

    // Test priority suggestion
    console.log('\n2. Testing Priority Analysis...')
    const priority = await aiService.analyzeTicket(
      'test-2',
      'priority_suggestion',
      testTicket
    )
    console.log('Priority Result:', priority)

    // Test category detection
    console.log('\n3. Testing Category Detection...')
    const category = await aiService.analyzeTicket(
      'test-3',
      'category_detection',
      testTicket
    )
    console.log('Category Result:', category)

    // Test response suggestion
    console.log('\n4. Testing Response Suggestion...')
    const response = await aiService.analyzeTicket(
      'test-4',
      'response_suggestion',
      testTicket
    )
    console.log('Response Result:', response)

    // Test urgency detection
    console.log('\n5. Testing Urgency Detection...')
    const urgency = await aiService.analyzeTicket(
      'test-5',
      'urgency_detection',
      testTicket
    )
    console.log('Urgency Result:', urgency)

  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

main().catch(console.error) 
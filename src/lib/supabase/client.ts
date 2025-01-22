import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Create a single client for use throughout the app
export const supabase = createClientComponentClient<Database>() 
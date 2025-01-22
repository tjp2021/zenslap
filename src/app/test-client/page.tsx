import { createServerClient } from '@/lib/supabase/component-server'

export default async function TestClientPage() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from('tickets').select('id').limit(1)
    
    return (
      <div className="p-4">
        <h1 className="text-xl mb-4">Test Client Results</h1>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify({ data, error }, null, 2)}
        </pre>
      </div>
    )
  } catch (error) {
    return <div>Error: {(error as Error).message}</div>
  }
} 
import { QueueManager } from '../services/QueueManager'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const queueManager = new QueueManager()

// Function to process new unassigned tickets
async function processUnassignedTickets() {
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id')
    .is('assignee', null)
    .eq('status', 'open')

  if (!tickets?.length) return

  for (const ticket of tickets) {
    await queueManager.autoAssignTicket(ticket.id)
  }
}

// Function to check and handle SLA violations
async function checkSLAViolations() {
  await queueManager.checkSLAViolations()
}

// Main worker function that runs periodically
export async function runQueueWorker() {
  try {
    console.log('🔄 Queue worker starting...')
    
    // Process unassigned tickets
    await processUnassignedTickets()
    
    // Check SLA violations
    await checkSLAViolations()
    
    console.log('✅ Queue worker finished successfully')
  } catch (error) {
    console.error('❌ Queue worker error:', error)
  }
}

// If running in a Node.js environment (not in browser)
if (typeof window === 'undefined') {
  // Run the worker every minute
  setInterval(runQueueWorker, 60000)
  
  // Initial run
  runQueueWorker()
} 
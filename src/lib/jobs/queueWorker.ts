import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export async function processQueue() {
  const supabase = createServerClient()
  
  // Process items in the queue
  const { data: queueItems, error } = await supabase
    .from('queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error fetching queue items:', error)
    return
  }

  for (const item of queueItems || []) {
    try {
      // Update status to processing
      await supabase
        .from('queue')
        .update({ status: 'processing' })
        .eq('id', item.id)

      // Process the item based on its type
      switch (item.type) {
        case 'email':
          await processEmailItem(item)
          break
        case 'notification':
          await processNotificationItem(item)
          break
        default:
          console.warn(`Unknown queue item type: ${item.type}`)
      }

      // Mark as completed
      await supabase
        .from('queue')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id)

    } catch (err) {
      console.error(`Error processing queue item ${item.id}:`, err)
      
      // Mark as failed
      await supabase
        .from('queue')
        .update({ 
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        })
        .eq('id', item.id)
    }
  }
}

async function processEmailItem(item: any) {
  // Email processing logic
}

async function processNotificationItem(item: any) {
  // Notification processing logic
}

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
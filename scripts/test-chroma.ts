import { ChromaService } from '../src/lib/services/integrations/chroma'

async function main() {
  try {
    const chromaService = ChromaService.getInstance()
    const result = await chromaService.testConnection()
    console.log('Test completed successfully:', result)
  } catch (error) {
    console.error('Test failed:', error)
  }
}

main() 
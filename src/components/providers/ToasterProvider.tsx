'use client'

import { Toaster } from 'sonner'

export function ToasterProvider() {
  return (
    <Toaster 
      position="top-right"
      expand={false}
      richColors
      closeButton
    />
  )
}
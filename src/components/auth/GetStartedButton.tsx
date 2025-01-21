'use client'

import { useRouter } from 'next/navigation'

export function GetStartedButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/auth/login')}
      className="px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
    >
      Get Started
    </button>
  )
} 
'use client'

import Link from 'next/link'

export function GetStartedButton() {
  return (
    <Link
      href="/auth/login"
      className="px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
    >
      Get Started
    </Link>
  )
} 
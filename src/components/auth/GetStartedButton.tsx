'use client'

import Link from 'next/link'

export function GetStartedButton() {
  return (
    <Link
      href="/auth/login"
      className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors duration-200 w-full sm:w-auto"
    >
      Sign In / Get Started
    </Link>
  )
} 
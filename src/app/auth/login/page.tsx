'use client'

import { AuthUI } from '@/components/auth/AuthUI'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <AuthUI />
    </div>
  )
} 
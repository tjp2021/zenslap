'use client'

import { GetStartedButton } from '@/components/auth/GetStartedButton'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Customer Support</span>
            <span className="block text-blue-600">Made Simple</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Streamline your customer support with our intuitive ticketing system. Handle customer inquiries efficiently and provide excellent service.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <GetStartedButton />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">Ticket Management</h3>
              <p className="mt-2 text-base text-gray-500">
                Efficiently manage and track customer support tickets in one place.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">Team Collaboration</h3>
              <p className="mt-2 text-base text-gray-500">
                Work together seamlessly with internal notes and mentions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">Customer Communication</h3>
              <p className="mt-2 text-base text-gray-500">
                Keep customers informed with clear and timely responses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

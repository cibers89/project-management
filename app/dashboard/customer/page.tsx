'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomerDashboard() {
  const [data, setData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/customer/dashboard')
      .then(res => res.json())
      .then(setData)
  }, [])

  if (!data) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Customer Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => router.push('/dashboard/customer/projects')}
          className="bg-white rounded-2xl shadow p-6 cursor-pointer"
        >
          <p className="text-sm text-gray-500">Total Projects</p>
          <p className="text-3xl font-bold">{data.total}</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Finished</p>
          <p className="text-3xl font-bold">{data.done}</p>
        </div>

        <div
          onClick={() =>
            router.push('/dashboard/customer/projects?filter=overdue')
          }
          className="bg-red-50 rounded-2xl shadow p-6 cursor-pointer"
        >
          <p className="text-sm text-red-600">Overdue</p>
          <p className="text-3xl font-bold text-red-700">
            {data.overdue}
          </p>
        </div>
      </div>
    </div>
  )
}

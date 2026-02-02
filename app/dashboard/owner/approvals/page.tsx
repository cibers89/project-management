'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ApprovalItem = {
  reportId: string
  reportType: 'daily' | 'weekly' | 'monthly'
  submittedAt: string
  project: {
    name: string
    startDate: string
    endDate: string
    customers: {
      name: string | null
      email: string | null
    }[]
  }
}

export default function OwnerApprovalListPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])

  useEffect(() => {
    fetch('/api/owner/approvals')
      .then(res => res.json())
      .then(data => setItems(data.reports || []))
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Pending Report Approval
      </h1>

      {items.length === 0 && (
        <p className="text-gray-500">
          No pending reports.
        </p>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <Link
            key={item.reportId}
            href={`/dashboard/owner/approvals/${item.reportType}/${item.reportId}`}
            className="block bg-white rounded-2xl shadow p-5 hover:bg-gray-50"
          >
            <div className="text-xs text-gray-500">
              {item.reportType.toUpperCase()} REPORT •{' '}
              {new Date(item.submittedAt).toLocaleString()}
            </div>

            <div className="font-semibold text-lg">
              {item.project.name}
            </div>

            <div className="text-sm text-gray-600">
              {new Date(
                item.project.startDate
              ).toLocaleDateString()}{' '}
              –{' '}
              {new Date(
                item.project.endDate
              ).toLocaleDateString()}
            </div>

            <div className="text-sm text-gray-600">
              Customer:{' '}
              {item.project.customers
                .map(c => c.name || c.email)
                .join(', ')}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

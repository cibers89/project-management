'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ReportItem = {
  id: string
  reportDate: string
  rejectNote: string | null
  project: {
    id: string
    name: string
    startDate: string
    endDate: string
    customers: {
      customer: {
        name: string | null
        email: string | null
      }
    }[]
  }
}

export default function ActionNeededReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/manager/reports/action-needed')
      .then(res => res.json())
      .then(data => {
        setReports(data.reports || [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Reports Need Action
      </h1>

      {reports.length === 0 && (
        <p className="text-gray-500">
          🎉 No rejected reports. Good job!
        </p>
      )}

      {reports.map(report => {
        const customers = report.project.customers
          .map(c => c.customer.name || c.customer.email)
          .join(', ')

        return (
          <div
            key={report.id}
            className="bg-white rounded-2xl shadow p-5 flex justify-between items-start"
          >
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {report.project.name}
              </p>
              <p className="text-gray-500">
                Customer: {customers || '-'}
              </p>
              <p className="text-gray-500">
                Project: {new Date(report.project.startDate).toLocaleDateString()}
                {' '}–{' '}
                {new Date(report.project.endDate).toLocaleDateString()}
              </p>
              <p className="text-red-600 text-xs">
                ❌ {report.rejectNote}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href={`/dashboard/manager/reports/${report.id}/edit`}
                className="px-4 py-2 bg-black text-white rounded-xl text-sm text-center"
              >
                Edit & Resubmit
              </Link>

              {/* DELETE FLOW (NANTI) */}
              <button
                disabled
                className="px-4 py-2 bg-gray-200 text-gray-400 rounded-xl text-sm cursor-not-allowed"
              >
                Delete (Approval Required)
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

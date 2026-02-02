'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Summary = {
  totalAssigned: number
  onProgressProjects: number
  overdueProjects: number
  reportsNeedAction: number
}

export default function ManagerDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/manager')
      .then(res => res.json())
      .then(data => setSummary(data))
  }, [])

  if (!summary) {
    return <div className="p-6">Loading dashboard...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Manager Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* TOTAL ASSIGNED */}
        <DashboardCard
          title="Assigned Projects"
          value={summary.totalAssigned}
          href="/dashboard/manager/projects"
        />

        {/* ON PROGRESS (CREATE REPORT ENTRY POINT) */}
        <DashboardCard
          title="On Progress Projects"
          value={summary.onProgressProjects}
          href="/dashboard/manager/projects?mode=report"
          highlight
        />

        {/* OVERDUE */}
        <DashboardCard
          title="Overdue Projects"
          value={summary.overdueProjects}
          href="/dashboard/manager/projects?status=overdue"
          danger={summary.overdueProjects > 0}
        />

        {/* REPORT NEED ACTION */}
        <DashboardCard
          title="Reports Need Action"
          value={summary.reportsNeedAction}
          href="/dashboard/manager/reports/action-needed"
        />
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  href,
  highlight,
  danger,
}: {
  title: string
  value: number
  href: string
  highlight?: boolean
  danger?: boolean
}) {
  let bg = 'bg-white text-black hover:bg-gray-50'

  if (danger) {
    bg = 'bg-red-600 text-white hover:bg-red-700'
  } else if (highlight) {
    bg = 'bg-black text-white hover:bg-gray-800'
  }

  return (
    <Link
      href={href}
      className={`rounded-2xl shadow p-5 transition ${bg}`}
    >
      <div className="text-sm opacity-80">
        {title}
      </div>
      <div className="text-3xl font-semibold mt-2">
        {value}
      </div>
    </Link>
  )
}

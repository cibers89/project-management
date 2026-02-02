'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Summary = {
  totalProject: number
  ongoingProject: number
  finishedProject: number
  overdueProject: number
  pendingApproval: number
}

export default function OwnerDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/owner')
      .then(res => res.json())
      .then(data => setSummary(data))
  }, [])

  if (!summary) {
    return <div className="p-6">Loading dashboard...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Owner Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <DashboardCard
          title="Total Project"
          value={summary.totalProject}
          href="/dashboard/owner/projects"
        />

        <DashboardCard
          title="Ongoing"
          value={summary.ongoingProject}
          href="/dashboard/owner/projects?status=ongoing"
        />

        <DashboardCard
          title="Finished"
          value={summary.finishedProject}
          href="/dashboard/owner/projects?status=finished"
        />

        <DashboardCard
          title="Overdue"
          value={summary.overdueProject}
          href="/dashboard/owner/projects?status=overdue"
        />

        <DashboardCard
          title="Pending Approval"
          value={summary.pendingApproval}
          href="/dashboard/owner/approvals"
          highlight
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
}: {
  title: string
  value: number
  href: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl shadow p-5 transition ${
        highlight
          ? 'bg-black text-white hover:bg-gray-800'
          : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-3xl font-semibold mt-2">
        {value}
      </div>
    </Link>
  )
}

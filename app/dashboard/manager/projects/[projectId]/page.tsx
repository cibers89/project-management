'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Report = {
  id: string
  content: string
  reportDate: string
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  rejectNote?: string | null
  photos: {
    id: string
    url: string
    caption: string
  }[]
}

type ProjectDetail = {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  isDone: boolean
  customers: {
    customer: {
      name: string | null
      email: string | null
    }
  }[]
  dailyReports: Report[]
}

export default function ManagerProjectDetailPage() {
  const { projectId } = useParams()
  const router = useRouter()

  const [project, setProject] = useState<ProjectDetail | null>(null)

  useEffect(() => {
    fetch(`/api/manager/projects/${projectId}`)
      .then(res => res.json())
      .then(data => setProject(data.project))
  }, [projectId])

  if (!project) {
    return <div className="p-6">Loading project...</div>
  }

  const customerNames = project.customers
    .map(c => c.customer.name || c.customer.email)
    .join(', ')

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">
            {project.name}
          </h1>
          <p className="text-sm text-gray-600">
            Customer: {customerNames || '-'}
          </p>
        </div>

        {!project.isDone && (
          <Link
            href={`/dashboard/manager/reports/create?projectId=${project.id}`}
            className="bg-black text-white px-4 py-2 rounded-xl"
          >
            Create Report
          </Link>
        )}
      </div>

      {/* PROJECT INFO */}
      <div className="bg-white rounded-2xl shadow p-5 text-sm text-gray-600">
        <p>
          <strong>Start:</strong>{' '}
          {new Date(project.startDate).toLocaleDateString()}
        </p>
        <p>
          <strong>End:</strong>{' '}
          {new Date(project.endDate).toLocaleDateString()}
        </p>
        {project.description && (
          <p className="mt-2">{project.description}</p>
        )}
      </div>

      {/* DAILY REPORTS */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Daily Reports
        </h2>

        {project.dailyReports.length === 0 && (
          <p className="text-gray-500">
            No reports yet.
          </p>
        )}

        {project.dailyReports.map(report => (
          <div
            key={report.id}
            className="border rounded-2xl p-5 bg-white space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {new Date(report.reportDate).toLocaleString()}
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  report.status === 'APPROVED'
                    ? 'bg-green-100 text-green-700'
                    : report.status === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {report.status}
              </span>
            </div>

            <p className="text-sm">{report.content}</p>

            {report.status === 'REJECTED' && report.rejectNote && (
              <p className="text-sm text-red-600">
                ❌ {report.rejectNote}
              </p>
            )}

            {/* PHOTOS */}
            {report.photos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {report.photos.map(photo => (
                  <div key={photo.id}>
                    <img
                      src={photo.url}
                      className="rounded-lg object-cover"
                    />
                    {photo.caption && (
                      <p className="text-xs text-gray-500 mt-1">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ACTION */}
            {report.status === 'REJECTED' && (
              <Link
                href={`/dashboard/manager/reports/${report.id}/edit`}
                className="inline-block text-sm text-blue-600 hover:underline mt-2"
              >
                Edit & Resubmit →
              </Link>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => router.back()}
        className="text-sm text-gray-600 hover:underline"
      >
        ← Back
      </button>
    </div>
  )
}

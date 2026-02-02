'use client'

import { useEffect, useState } from 'react'

type Photo = {
  id: string
  url: string
  caption: string | null
}

type Report = {
  id: string
  reportDate: string
  content: string
  project: {
    name: string
  }
  createdBy: {
    name: string | null
    email: string | null
  }
  photos: Photo[]
}

export default function OwnerDailyReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports/daily')
      .then(res => res.json())
      .then(data => {
        setReports(Array.isArray(data.reports) ? data.reports : [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 text-center">
        Loading reports...
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">
        Daily Reports
      </h1>

      {reports.length === 0 && (
        <p className="text-gray-500">
          No reports submitted yet.
        </p>
      )}

      {reports.map(report => (
        <div
          key={report.id}
          className="bg-white rounded-2xl shadow p-6 space-y-4"
        >
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="font-semibold text-lg">
                {report.project.name}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date(report.reportDate).toDateString()}
              </p>
            </div>

            <div className="text-sm text-gray-500">
              By {report.createdBy.name || report.createdBy.email}
            </div>
          </div>

          {/* CONTENT */}
          <p className="whitespace-pre-line">
            {report.content}
          </p>

          {/* PHOTOS */}
          {report.photos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {report.photos.map(photo => (
                <div
                  key={photo.id}
                  className="border rounded-xl overflow-hidden"
                >
                  <img
                    src={photo.url}
                    alt="report"
                    className="w-full h-48 object-cover"
                  />

                  {photo.caption && (
                    <div className="p-3 text-sm bg-gray-50">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

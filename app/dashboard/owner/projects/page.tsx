'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

/* =======================
 * TYPES
 ======================= */
type RatingFeedback = {
  id: string
  rating: number
  feedback: string | null
  customerName?: string | null
}

type RatingSummary = {
  average: number
  count: number
  feedbacks?: RatingFeedback[]
}

type Project = {
  id: string
  name: string
  startDate?: string
  endDate: string
  isDone: boolean
  manager: {
    name: string | null
    email: string | null
  }
  customers: {
    name: string | null
    email: string | null
  }[]
  reportCount: {
    dailyReports: number
    weeklyReports: number
    monthlyReports: number
  }
  highlightPhoto: string | null

  // NEW (OPTIONAL)
  ratingSummary?: RatingSummary | null
  latestReportDate?: string | null
}

const PAGE_SIZE = 10

export default function OwnerProjectListPage() {
  const params = useSearchParams()
  const status = params.get('status') ?? 'total'

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [openRatingId, setOpenRatingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/projects/owner?status=${status}`)
      .then(res => res.json())
      .then(data => {
        setProjects(Array.isArray(data.projects) ? data.projects : [])
      })
      .finally(() => setLoading(false))
  }, [status])

  const filtered = useMemo(() => {
    return projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [projects, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  if (loading) {
    return <div className="p-6 text-center">Loading projects...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold capitalize">
          {status} Projects
        </h1>

        <input
          className="border rounded-xl px-4 py-2 w-full md:w-64"
          placeholder="Search project..."
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="space-y-5">
        {paginated.map(project => {
          const now = new Date()
          const end = new Date(project.endDate)

          const overdue = !project.isDone && end < now

          let statusLabel = 'On Progress'
          let statusClass = 'bg-blue-100 text-blue-700'

          if (project.isDone) {
            statusLabel = 'Done'
            statusClass = 'bg-green-100 text-green-700'
          } else if (overdue) {
            statusLabel = 'Overdue'
            statusClass = 'bg-red-100 text-red-700'
          }

          const totalReports =
            project.reportCount.dailyReports +
            project.reportCount.weeklyReports +
            project.reportCount.monthlyReports

          const ratingOpen = openRatingId === project.id

          return (
            <div
              key={project.id}
              className="relative overflow-hidden rounded-2xl shadow min-h-[180px]"
            >
              {project.highlightPhoto ? (
                <img
                  src={project.highlightPhoto}
                  className="absolute left-0 top-0 h-full w-1/3 object-cover opacity-30"
                />
              ) : (
                <div className="absolute left-0 top-0 h-full w-1/3 bg-gray-200" />
              )}

              <div className="absolute inset-0 bg-white/70" />

              <div className="relative p-5 flex flex-col gap-4">
                {/* TOP */}
                <div className="flex flex-col md:flex-row md:justify-between gap-4">
                  {/* LEFT */}
                  <div className="space-y-1">
                    <h2 className="font-semibold text-lg">
                      {project.name}
                    </h2>

                    <p className="text-sm text-gray-600">
                      Manager:{' '}
                      {project.manager.name ||
                        project.manager.email ||
                        '-'}
                    </p>

                    <p className="text-sm text-gray-600">
                      Customer:{' '}
                      {project.customers.length > 0
                        ? project.customers
                            .map(c => c.name || c.email)
                            .join(', ')
                        : '-'}
                    </p>

                    <span
                      className={`inline-block text-xs px-2 py-1 rounded ${statusClass}`}
                    >
                      {statusLabel}
                    </span>

                    {/* ===== RATING SUMMARY (DONE ONLY) ===== */}
                    {project.isDone && project.ratingSummary && (
                      <div className="mt-2">
                        <button
                          onClick={() =>
                            setOpenRatingId(
                              ratingOpen ? null : project.id
                            )
                          }
                          className="flex items-center gap-2 text-sm font-medium"
                        >
                          <span>
                            {project.ratingSummary.average.toFixed(1)} ★
                            <span className="text-xs text-gray-500 ml-1">
                              ({project.ratingSummary.count})
                            </span>
                          </span>
                          <span className="text-xs">
                            {ratingOpen ? '▲' : '▼'}
                          </span>
                        </button>

                        {ratingOpen &&
                          project.ratingSummary.feedbacks &&
                          project.ratingSummary.feedbacks.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {project.ratingSummary.feedbacks.map(fb => (
                                <div
                                  key={fb.id}
                                  className="border rounded-xl p-3 text-sm bg-gray-50"
                                >
                                  <div className="flex justify-between mb-1">
                                    <span className="font-medium">
                                      {fb.customerName || 'Customer'}
                                    </span>
                                    <span className="text-yellow-400">
                                      {fb.rating} ★
                                    </span>
                                  </div>
                                  {fb.feedback && (
                                    <p className="text-gray-700 break-words">
                                      {fb.feedback}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT */}
                  <div className="flex flex-col items-start md:items-end gap-3 text-sm">
                    <div className="text-gray-700">
                      Total Laporan: {totalReports}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/owner/projects/${project.id}`}
                        className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-100"
                      >
                        View
                      </Link>

                      {!project.isDone && (
                        <Link
                          href={`/dashboard/owner/projects/${project.id}/edit`}
                          className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-100"
                          title="Edit Project"
                        >
                          ✏️
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${
                page === i + 1
                  ? 'bg-black text-white'
                  : 'border'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

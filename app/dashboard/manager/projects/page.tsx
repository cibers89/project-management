'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

  highlightPhoto?: string | null
  latestReportDate?: string | null

  reportCount?: {
    dailyReports: number
    weeklyReports: number
    monthlyReports: number
  }

  ratingSummary?: RatingSummary | null
}

const PAGE_SIZE = 10

export default function ManagerProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const params = useSearchParams()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [openRatingId, setOpenRatingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)

    const qs = params.toString()
    fetch(`/api/manager/projects${qs ? `?${qs}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setProjects(Array.isArray(data.projects) ? data.projects : [])
      })
      .finally(() => setLoading(false))
  }, [params])

  /* =======================
   * SEARCH
   ======================= */
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
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          Project List
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

      {paginated.length === 0 && (
        <div className="text-gray-500">
          No projects found.
        </div>
      )}

      {/* ================= PROJECT LIST ================= */}
      <div className="space-y-5">
        {paginated.map(project => {
          const now = new Date()
          const end = new Date(project.endDate)

          const isOverdue = !project.isDone && end < now

          let statusLabel = 'On Progress'
          let statusClass = 'bg-yellow-100 text-yellow-700'

          if (project.isDone) {
            statusLabel = 'Done'
            statusClass = 'bg-green-100 text-green-700'
          } else if (isOverdue) {
            statusLabel = 'Overdue'
            statusClass = 'bg-red-100 text-red-700'
          }

          const totalReports = project.reportCount
            ? project.reportCount.dailyReports +
              project.reportCount.weeklyReports +
              project.reportCount.monthlyReports
            : 0

          const customerNames = project.customers
            .map(c => c.customer.name || c.customer.email)
            .join(', ')

          const ratingOpen = openRatingId === project.id

          return (
            <div
              key={project.id}
              className="relative overflow-hidden rounded-2xl shadow min-h-[180px]"
            >
              {/* THUMBNAIL */}
              {project.highlightPhoto ? (
                <img
                  src={project.highlightPhoto}
                  className="absolute left-0 top-0 h-full w-1/3 object-cover opacity-30"
                />
              ) : (
                <div className="absolute left-0 top-0 h-full w-1/3 bg-gray-200" />
              )}

              <div className="absolute inset-0 bg-white/70" />

              <div className="relative p-5 flex flex-col md:flex-row md:justify-between gap-4">
                {/* LEFT */}
                <div className="space-y-1">
                  <h2 className="font-semibold text-lg">
                    {project.name}
                  </h2>

                  <p className="text-sm text-gray-600">
                    Customer: {customerNames || '-'}
                  </p>

                  <p className="text-sm text-gray-600">
                    {new Date(project.startDate).toLocaleDateString()}
                    {' '}–{' '}
                    {new Date(project.endDate).toLocaleDateString()}
                  </p>

                  <span
                    className={`inline-block text-xs px-2 py-1 rounded ${statusClass}`}
                  >
                    {statusLabel}
                  </span>

                  {/* ===== RATING (DONE ONLY) ===== */}
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
                      href={`/dashboard/manager/projects/${project.id}`}
                      className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-100"
                    >
                      View
                    </Link>

                    {!project.isDone && (
                      <Link
                        href={`/dashboard/manager/reports/create?projectId=${project.id}`}
                        className="px-4 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-800"
                      >
                        Create Report
                      </Link>
                    )}
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

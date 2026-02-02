'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

/* =======================
 * TYPES
 ======================= */
type Comment = {
  id: string
  message: string
  createdAt: string
  user: {
    name: string | null
    email: string | null
  }
}

type Photo = {
  id: string
  url: string
  caption: string | null
}

type Report = {
  id: string
  content: string
  createdAt: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  rejectNote?: string | null
  createdBy: {
    name: string | null
    email: string | null
  }
  photos?: Photo[]
  comments?: Comment[]
}

type ProjectFile = {
  id: string
  url: string
  fileName: string | null
  caption: string | null
  type: 'IMAGE' | 'DOCUMENT'
}

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

  manager: {
    name: string | null
    email: string | null
  }

  customers: {
    customer: {
      name: string | null
      email: string | null
    }
  }[]

  dailyReports: Report[]
  files: ProjectFile[]

  ratingSummary?: RatingSummary | null
}

/* =======================
 * PAGE
 ======================= */
export default function OwnerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [openRating, setOpenRating] = useState(false)

  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  /* =======================
   * LOAD PROJECT
   ======================= */
  const loadProject = async () => {
    const res = await fetch(`/api/projects/owner/${projectId}`)
    const data = await res.json()
    setProject(data.project)
  }

  useEffect(() => {
    loadProject().finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <div className="p-6">Loading...</div>
  if (!project) return <div className="p-6">Not found</div>

  /* =======================
   * DATE & STATUS
   ======================= */
  const start = new Date(project.startDate)
  const end = new Date(project.endDate)
  const now = new Date()

  const remainingDays = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  let projectStatusLabel = 'On Progress'
  let projectStatusClass = 'bg-blue-100 text-blue-700'

  if (project.isDone) {
    projectStatusLabel = 'Done'
    projectStatusClass = 'bg-green-100 text-green-700'
  } else if (now > end) {
    projectStatusLabel = 'Overdue'
    projectStatusClass = 'bg-red-100 text-red-700'
  }

  /* =======================
   * REPORT STATUS BADGE
   ======================= */
  const reportStatusBadge = (status: Report['status']) => {
    const map = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SUBMITTED: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
    }

    return (
      <span className={`inline-block text-xs px-2 py-1 rounded ${map[status]}`}>
        {status}
      </span>
    )
  }

  /* =======================
   * APPROVAL ACTIONS
   ======================= */
  const approveReport = async (reportId: string) => {
    setActionLoading(reportId)
    setSuccessMsg(null)

    const res = await fetch(
      `/api/owner/approvals/daily/${reportId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      }
    )

    if (res.ok) {
      await loadProject()
      setSuccessMsg('✅ Report approved successfully')
    }

    setActionLoading(null)
  }

  const rejectReport = async (reportId: string) => {
    const note = rejectReason[reportId]
    if (!note) {
      alert('Reject reason is required')
      return
    }

    setActionLoading(reportId)
    setSuccessMsg(null)

    const res = await fetch(
      `/api/owner/approvals/daily/${reportId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectNote: note,
        }),
      }
    )

    if (res.ok) {
      await loadProject()
      setRejectReason(prev => ({ ...prev, [reportId]: '' }))
      setSuccessMsg('❌ Report rejected')
    }

    setActionLoading(null)
  }

  /* =======================
   * RENDER
   ======================= */
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>

          {!project.isDone && (
            <Link
              href={`/dashboard/owner/projects/${project.id}/edit`}
              className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-100 w-fit"
            >
              ✏️ Edit
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
          <div><b>Start:</b> {start.toLocaleDateString()}</div>
          <div><b>End:</b> {end.toLocaleDateString()}</div>
          <div>
            <b>Remaining:</b>{' '}
            {remainingDays >= 0 ? `${remainingDays} days` : 'Exceeded'}
          </div>
          <div>
            <b>Manager:</b>{' '}
            {project.manager.name || project.manager.email || '-'}
          </div>
          <div className="lg:col-span-2">
            <b>Customers:</b>{' '}
            {project.customers.map(c =>
              c.customer.name || c.customer.email
            ).join(', ') || '-'}
          </div>

          <div className="space-y-1">
            <span
              className={`inline-block text-xs px-2 py-1 rounded ${projectStatusClass}`}
            >
              {projectStatusLabel}
            </span>

            {/* ===== RATING SUMMARY ===== */}
            {project.isDone && project.ratingSummary && (
              <div className="mt-2">
                <button
                  onClick={() => setOpenRating(v => !v)}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <span>
                    {project.ratingSummary.average.toFixed(1)} ★
                    <span className="text-xs text-gray-500 ml-1">
                      ({project.ratingSummary.count})
                    </span>
                  </span>
                  <span className="text-xs">
                    {openRating ? '▲' : '▼'}
                  </span>
                </button>

                {openRating &&
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
        </div>

        {successMsg && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            {successMsg}
          </div>
        )}
      </div>

      {/* ================= PROJECT FILES ================= */}
      {project.files.filter(f => f.type === 'IMAGE').length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Project Files</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {project.files
              .filter(f => f.type === 'IMAGE')
              .map(img => (
                <div
                  key={img.id}
                  className="border rounded-xl overflow-hidden cursor-pointer"
                  onClick={() => setPreviewUrl(img.url)}
                >
                  <img src={img.url} className="w-full h-40 object-cover" />
                  {img.caption && (
                    <div className="p-2 text-xs text-gray-600 bg-gray-50 break-words">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ================= REPORTS ================= */}
      <div className="bg-white rounded-2xl shadow">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">
            Project Reports ({project.dailyReports.length})
          </h2>
        </div>

        {project.dailyReports.map(report => {
          const open = openReportId === report.id
          const photos = report.photos ?? []

          return (
            <div key={report.id} className="border-t">
              <button
                onClick={() => setOpenReportId(open ? null : report.id)}
                className="w-full text-left p-5 flex justify-between items-center"
              >
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    Submitted by {report.createdBy.name || report.createdBy.email}
                    {' • '}
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                  {reportStatusBadge(report.status)}
                </div>
                <span>{open ? '−' : '+'}</span>
              </button>

              {open && (
                <div className="px-5 pb-5 space-y-4">
                  <p className="whitespace-pre-line">{report.content}</p>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {photos.map(photo => (
                        <div
                          key={photo.id}
                          className="border rounded-xl overflow-hidden cursor-pointer"
                          onClick={() => setPreviewUrl(photo.url)}
                        >
                          <img
                            src={photo.url}
                            className="w-full h-32 object-cover"
                          />
                          {photo.caption && (
                            <div className="p-2 text-xs text-gray-600 bg-gray-50 break-words">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {report.status === 'SUBMITTED' && (
                    <div className="border-t pt-4 space-y-3">
                      <textarea
                        placeholder="Reject reason"
                        className="w-full border rounded-xl p-2 text-sm"
                        value={rejectReason[report.id] || ''}
                        onChange={e =>
                          setRejectReason(prev => ({
                            ...prev,
                            [report.id]: e.target.value,
                          }))
                        }
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => approveReport(report.id)}
                          disabled={actionLoading === report.id}
                          className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectReport(report.id)}
                          disabled={actionLoading === report.id}
                          className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {report.status === 'REJECTED' && report.rejectNote && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                      <b>Reject Reason:</b> {report.rejectNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ================= IMAGE PREVIEW ================= */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            className="max-w-[90vw] max-h-[90vh] rounded-xl"
          />
        </div>
      )}
    </div>
  )
}

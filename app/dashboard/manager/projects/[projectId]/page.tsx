'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

/* =======================
 * TYPES
 ======================= */
type Photo = {
  id: string
  url: string
  caption: string | null
}

type Comment = {
  id: string
  message: string
  createdAt: string
  user: {
    name: string | null
    email: string | null
  }
}

type Report = {
  id: string
  content: string
  reportDate: string
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  rejectNote?: string | null
  photos: Photo[]
  comments?: Comment[]
}

type ProjectFile = {
  id: string
  url: string
  fileName: string | null
  caption: string | null
  type: 'IMAGE' | 'DOCUMENT'
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
  files: ProjectFile[]
  dailyReports: Report[]
}

/* =======================
 * PAGE
 ======================= */
export default function ManagerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /* =======================
   * LOAD PROJECT
   ======================= */
  useEffect(() => {
    setLoading(true)
    fetch(`/api/manager/projects/${projectId}`)
      .then(res => res.json())
      .then(data => setProject(data.project))
      .finally(() => setLoading(false))
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

  const customerNames = project.customers
    .map(c => c.customer.name || c.customer.email)
    .join(', ')

  /* =======================
   * REPORT STATUS BADGE
   ======================= */
  const reportStatusBadge = (status: Report['status']) => {
    const map = {
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
              href={`/dashboard/manager/reports/create?projectId=${project.id}`}
              className="px-4 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-800 w-fit"
            >
              Create Report
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
          <div className="lg:col-span-2">
            <b>Customers:</b> {customerNames || '-'}
          </div>
          <div>
            <span
              className={`inline-block text-xs px-2 py-1 rounded ${projectStatusClass}`}
            >
              {projectStatusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ================= PROJECT IMAGES ================= */}
      {project.files.filter(f => f.type === 'IMAGE').length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Project Images</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {project.files
              .filter(f => f.type === 'IMAGE')
              .map(img => (
                <div
                  key={img.id}
                  className="border rounded-xl overflow-hidden cursor-pointer"
                  onClick={() => setPreviewUrl(img.url)}
                >
                  <img
                    src={img.url}
                    className="w-full h-40 object-cover"
                  />
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

      {/* ================= PROJECT DOCUMENTS ================= */}
      {project.files.filter(f => f.type === 'DOCUMENT').length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Project Documents</h2>

          <div className="space-y-2">
            {project.files
              .filter(f => f.type === 'DOCUMENT')
              .map(file => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 border rounded-xl p-3 hover:bg-gray-50"
                >
                  <div className="text-2xl">📄</div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium break-words">
                      {file.fileName || 'Document'}
                    </div>

                    {file.caption && (
                      <div className="text-xs text-gray-600 mt-1 break-words">
                        {file.caption}
                      </div>
                    )}
                  </div>
                </a>
              ))}
          </div>
        </div>
      )}

      {/* ================= REPORTS ================= */}
      <div className="bg-white rounded-2xl shadow">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">
            Daily Reports ({project.dailyReports.length})
          </h2>
        </div>

        {project.dailyReports.length === 0 && (
          <div className="p-5 text-gray-500">
            No reports yet.
          </div>
        )}

        {project.dailyReports.map(report => {
          const open = openReportId === report.id
          const photos = report.photos ?? []
          const comments = report.comments ?? []

          const sortedComments = [...comments].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          )

          return (
            <div key={report.id} className="border-t">
              <button
                onClick={() =>
                  setOpenReportId(open ? null : report.id)
                }
                className="w-full text-left p-5 flex justify-between items-center"
              >
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    {new Date(report.reportDate).toLocaleString()}
                  </div>
                  {reportStatusBadge(report.status)}
                </div>
                <span>{open ? '−' : '+'}</span>
              </button>

              {open && (
                <div className="px-5 pb-5 space-y-4">
                  <p className="whitespace-pre-line text-sm">
                    {report.content}
                  </p>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {photos.map(photo => (
                        <div
                          key={photo.id}
                          className="border rounded-xl overflow-hidden cursor-pointer"
                          onClick={() =>
                            setPreviewUrl(photo.url)
                          }
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

                  {/* ===== CUSTOMER FEEDBACK (RESTORED & MATCH OWNER) ===== */}
                  {sortedComments.length > 0 && (
                    <div className="border-t pt-4 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Customer Feedback
                      </h3>

                      {sortedComments.map(c => (
                        <div
                          key={c.id}
                          className="border rounded-xl p-3 text-sm bg-gray-50"
                        >
                          <div className="flex justify-between mb-1 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">
                              Customer •{' '}
                              {c.user.name ||
                                c.user.email ||
                                'Unknown'}
                            </span>
                            <span>
                              {new Date(
                                c.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-line break-words">
                            {c.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {report.status === 'REJECTED' && report.rejectNote && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                      <b>Reject Reason:</b> {report.rejectNote}
                    </div>
                  )}

                  {report.status === 'REJECTED' && (
                    <Link
                      href={`/dashboard/manager/reports/${report.id}/edit`}
                      className="inline-block text-sm text-blue-600 hover:underline"
                    >
                      Edit & Resubmit →
                    </Link>
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

      <button
        onClick={() => router.back()}
        className="text-sm text-gray-600 hover:underline"
      >
        ← Back
      </button>
    </div>
  )
}

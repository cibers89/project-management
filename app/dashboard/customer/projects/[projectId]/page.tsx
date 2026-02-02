'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

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

type ProjectFile = {
  id: string
  url: string
  fileName: string | null
  caption: string | null
  type: 'IMAGE' | 'DOCUMENT'
}

type DailyReport = {
  id: string
  content: string
  reportDate: string
  status: 'APPROVED'
  photos: Photo[]
  comments: Comment[]
}

type ProjectRating = {
  rating: number
  feedback: string | null
}

type ProjectDetail = {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  isDone: boolean
  files?: ProjectFile[]
  dailyReports: DailyReport[]
  rating?: ProjectRating | null
}

/* =======================
 * PAGE
 ======================= */
export default function CustomerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [rating, setRating] = useState<number>(0)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  /* =======================
   * LOAD PROJECT
   ======================= */
  const loadProject = async () => {
    const res = await fetch(`/api/customer/projects/${projectId}`)
    const data = await res.json()
    setProject(data.project)
    setLoading(false)
  }

  useEffect(() => {
    loadProject()
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [project?.dailyReports])

  /* =======================
   * COMMENT
   ======================= */
  const submitComment = async (reportId: string) => {
    if (!message.trim()) return
    setSubmitting(true)

    await fetch('/api/customer/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, message }),
    })

    setMessage('')
    setSubmitting(false)
    loadProject()
  }

  /* =======================
   * SUBMIT RATING
   ======================= */
  const submitRating = async () => {
    if (rating < 1) {
      alert('Please select rating')
      return
    }

    setRatingSubmitting(true)

    await fetch(`/api/customer/projects/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        feedback: ratingFeedback,
      }),
    })

    setRatingSubmitting(false)
    loadProject()
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!project) return <div className="p-6">Not found</div>

  const start = new Date(project.startDate)
  const end = new Date(project.endDate)

  const files = project.files ?? []
  const images = files.filter(f => f.type === 'IMAGE')
  const documents = files.filter(f => f.type === 'DOCUMENT')

  const feedbackReadOnly = project.isDone

  /* =======================
   * RENDER
   ======================= */
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-2xl font-semibold">{project.name}</h1>

        {project.description && (
          <p className="text-gray-600">{project.description}</p>
        )}

        <div className="text-sm text-gray-600 flex gap-4">
          <div><b>Start:</b> {start.toLocaleDateString()}</div>
          <div><b>End:</b> {end.toLocaleDateString()}</div>
          {project.isDone && (
            <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">
              DONE
            </span>
          )}
        </div>
      </div>

      {/* ================= PROJECT FILES ================= */}
      {(images.length > 0 || documents.length > 0) && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <h2 className="text-lg font-semibold">Project Files</h2>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map(img => (
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
          )}

          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map(doc => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  className="block border rounded-xl p-3 text-sm hover:bg-gray-50"
                >
                  <div className="font-medium break-words">
                    {doc.fileName || 'Untitled document'}
                  </div>
                  {doc.caption && (
                    <div className="text-xs text-gray-500 break-words mt-1">
                      {doc.caption}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= RATING ================= */}
      {project.isDone && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Rate This Project</h2>

          {project.rating ? (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className={`text-2xl ${
                      i <= project.rating!.rating
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              {project.rating.feedback && (
                <p className="text-sm text-gray-600">
                  {project.rating.feedback}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    onClick={() => setRating(i)}
                    className={`text-3xl ${
                      i <= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Optional feedback..."
                className="w-full border rounded-xl p-3 text-sm"
                value={ratingFeedback}
                onChange={e => setRatingFeedback(e.target.value)}
              />

              <button
                onClick={submitRating}
                disabled={ratingSubmitting}
                className="px-4 py-2 rounded-xl bg-black text-white text-sm disabled:opacity-50"
              >
                Submit Rating
              </button>
            </div>
          )}
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

          return (
            <div key={report.id} className="border-t">
              <button
                onClick={() => setOpenReportId(open ? null : report.id)}
                className="w-full text-left p-5 flex justify-between items-center"
              >
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    Approved report •{' '}
                    {new Date(report.reportDate).toLocaleString()}
                  </div>
                  <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                    APPROVED
                  </span>
                </div>
                <span>{open ? '−' : '+'}</span>
              </button>

              {open && (
                <div className="px-5 pb-5 space-y-4">
                  <p className="whitespace-pre-line text-sm">
                    {report.content}
                  </p>

                  {report.photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {report.photos.map(photo => (
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

                  {/* COMMENTS */}
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium">Feedback</p>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {report.comments.map(c => (
                        <div
                          key={c.id}
                          className="bg-gray-50 rounded-xl p-3 text-sm"
                        >
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{c.user.name || c.user.email}</span>
                            <span>
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p>{c.message}</p>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>

                    {!feedbackReadOnly ? (
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Type feedback..."
                          className="flex-1 border rounded-xl p-3 text-sm"
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                        />
                        <button
                          disabled={submitting}
                          onClick={() => submitComment(report.id)}
                          className="px-4 rounded-xl text-sm bg-black text-white disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Project completed. Feedback is read-only.
                      </p>
                    )}
                  </div>
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

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ApprovalDetailPage() {
  const { reportType, reportId } = useParams<{
    reportType: string
    reportId: string
  }>()

  const router = useRouter()
  const [report, setReport] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/owner/approval-detail/${reportType}/${reportId}`)
      .then(res => res.json())
      .then(data => setReport(data.report))
      .finally(() => setLoading(false))
  }, [reportType, reportId])

  const submit = async (action: 'approve' | 'reject') => {
    const res = await fetch(
      `/api/owner/approval-detail/${reportType}/${reportId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectNote,
        }),
      }
    )

    if (res.ok) {
      router.push('/dashboard/owner/approvals')
    } else {
      alert('Failed to process report')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!report) return <div className="p-6">Not found</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* PROJECT CONTEXT */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-1">
        <div className="text-sm text-gray-500">
          {reportType.toUpperCase()} REPORT
        </div>
        <h1 className="text-xl font-semibold">
          {report.project.name}
        </h1>

        <div className="text-sm text-gray-600">
          {new Date(
            report.project.startDate
          ).toLocaleDateString()}{' '}
          –{' '}
          {new Date(
            report.project.endDate
          ).toLocaleDateString()}
        </div>

        <div className="text-sm text-gray-600">
          Customer:{' '}
          {report.project.customers
            .map((c: any) => c.customer.name || c.customer.email)
            .join(', ')}
        </div>
      </div>

      {/* REPORT DETAIL */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="text-sm text-gray-500">
          Submitted by{' '}
          {report.createdBy.name || report.createdBy.email} •{' '}
          {new Date(report.createdAt).toLocaleString()}
        </div>

        <p className="whitespace-pre-line">
          {report.content}
        </p>

        {/* PHOTOS */}
        {report.photos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.photos.map((p: any) => (
              <div
                key={p.id}
                className="border rounded-xl overflow-hidden"
              >
                <img
                  src={p.url}
                  className="w-full h-48 object-cover"
                />
                {p.caption && (
                  <div className="p-2 text-sm bg-gray-50">
                    {p.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CUSTOMER COMMENTS */}
        <div className="pt-4 border-t">
          <h3 className="font-medium mb-2">
            Customer Feedback
          </h3>

          {report.comments.length === 0 && (
            <p className="text-sm text-gray-500">
              No comments yet.
            </p>
          )}

          <div className="space-y-2">
            {report.comments.map((c: any) => (
              <div
                key={c.id}
                className="bg-gray-50 rounded-xl p-3 text-sm"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {c.user.name || c.user.email} •{' '}
                  {new Date(
                    c.createdAt
                  ).toLocaleString()}
                </div>
                {c.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACTION */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <textarea
          className="w-full border rounded-xl p-3 text-sm"
          placeholder="Reject note (required if rejecting)"
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={() => submit('approve')}
            className="flex-1 bg-green-600 text-white rounded-xl py-2"
          >
            Approve
          </button>
          <button
            onClick={() => submit('reject')}
            className="flex-1 bg-red-600 text-white rounded-xl py-2"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

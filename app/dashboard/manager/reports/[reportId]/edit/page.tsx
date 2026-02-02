'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Photo = {
  id: string
  url: string
  caption: string
}

type PhotoDraft = {
  file: File
  preview: string
  caption: string
}

export default function EditDailyReportPage() {
  const { reportId } = useParams()
  const router = useRouter()

  const [content, setContent] = useState('')
  const [rejectNote, setRejectNote] = useState<string | null>(null)
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([])
  const [newPhotos, setNewPhotos] = useState<PhotoDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/manager/reports/daily/${reportId}`)
      .then(res => res.json())
      .then(data => {
        setContent(data.report.content)
        setRejectNote(data.report.rejectNote)
        setExistingPhotos(data.report.photos)
        setLoading(false)
      })
  }, [reportId])

  const addPhotos = (files: FileList | null) => {
    if (!files) return

    const drafts: PhotoDraft[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }))

    setNewPhotos(prev => [...prev, ...drafts])
  }

  const removeNewPhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const updateCaption = (index: number, caption: string) => {
    setNewPhotos(prev =>
      prev.map((p, i) =>
        i === index ? { ...p, caption } : p
      )
    )
  }

  const submit = async () => {
    setError(null)

    if (!content.trim()) {
      setError('Content is required')
      return
    }

    const formData = new FormData()
    formData.append('content', content)

    newPhotos.forEach(p => {
      formData.append('photos', p.file)
      formData.append('captions', p.caption)
    })

    const res = await fetch(
      `/api/manager/reports/daily/${reportId}`,
      {
        method: 'PUT',
        body: formData,
      }
    )

    if (!res.ok) {
      setError('Failed to resubmit report')
      return
    }

    router.back()
  }

  if (loading) {
    return <div className="p-6">Loading report...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Edit & Resubmit Report
      </h1>

      {rejectNote && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <strong>Reject Note:</strong> {rejectNote}
        </div>
      )}

      {/* CONTENT */}
      <div>
        <label className="block text-sm mb-1">
          Report Content
        </label>
        <textarea
          className="border rounded-xl p-3 w-full min-h-[140px]"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
      </div>

      {/* EXISTING PHOTOS */}
      {existingPhotos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">
            Existing Photos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {existingPhotos.map(p => (
              <div key={p.id}>
                <img
                  src={p.url}
                  className="rounded-lg object-cover"
                />
                {p.caption && (
                  <p className="text-xs text-gray-500 mt-1">
                    {p.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW PHOTOS */}
      <div>
        <label className="block text-sm mb-2">
          Add New Photos
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={e => addPhotos(e.target.files)}
        />

        {newPhotos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {newPhotos.map((p, i) => (
              <div
                key={i}
                className="relative border rounded-xl p-3 space-y-2"
              >
                <button
                  onClick={() => removeNewPhoto(i)}
                  className="absolute top-2 right-2 w-6 h-6 bg-black text-white rounded-full text-xs"
                >
                  ✕
                </button>

                <img
                  src={p.preview}
                  className="rounded-lg object-cover"
                />

                <input
                  type="text"
                  placeholder="Photo caption"
                  className="border rounded-lg p-2 w-full text-sm"
                  value={p.caption}
                  onChange={e =>
                    updateCaption(i, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        className="bg-black text-white px-6 py-3 rounded-xl"
      >
        Resubmit Report
      </button>
    </div>
  )
}

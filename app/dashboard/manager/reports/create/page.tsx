'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'

type PhotoDraft = {
  file: File
  preview: string
  caption: string
}

export default function CreateDailyReportPage() {
  const params = useSearchParams()
  const router = useRouter()

  const projectId = params.get('projectId')

  const [content, setContent] = useState('')
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!projectId) {
    return (
      <div className="p-6 text-red-600">
        Invalid project context.
      </div>
    )
  }

  /* =====================
     PHOTO HANDLERS
  ===================== */

  const addPhotos = (files: FileList | null) => {
    if (!files) return

    const drafts: PhotoDraft[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }))

    setPhotos(prev => [...prev, ...drafts])
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const updateCaption = (index: number, caption: string) => {
    setPhotos(prev =>
      prev.map((p, i) =>
        i === index ? { ...p, caption } : p
      )
    )
  }

  /* =====================
     SUBMIT
  ===================== */

  const submit = async () => {
    setLoading(true)
    setError(null)

    if (!content.trim()) {
      setError('Report content is required')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('content', content)

    photos.forEach(p => {
      formData.append('photos', p.file)
      formData.append('captions', p.caption)
    })

    const res = await fetch('/api/reports/daily', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      setError('Failed to submit report')
      setLoading(false)
      return
    }

    router.back()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Create Report
      </h1>

      {/* CONTENT */}
      <div>
        <label className="block text-sm mb-1">
          Report Content
        </label>
        <textarea
          className="border rounded-xl p-3 w-full min-h-[140px]"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Describe today’s progress..."
        />
      </div>

      {/* PHOTOS */}
      <div>
        <label className="block text-sm mb-2">
          Photos
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={e => addPhotos(e.target.files)}
        />

        {photos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {photos.map((p, i) => (
              <div
                key={i}
                className="relative border rounded-xl p-3 space-y-2"
              >
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-2 right-2 w-6 h-6 bg-black text-white rounded-full text-xs"
                >
                  ✕
                </button>

                <img
                  src={p.preview}
                  className="w-full max-h-48 object-cover rounded-lg"
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
        disabled={loading}
        className="bg-black text-white px-6 py-3 rounded-xl disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </div>
  )
}

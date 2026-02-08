'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'

type UploadItem = {
  id: string
  file: File
  preview: string
  caption: string
}

type ProgressMap = Record<string, number>
type StatusMap = Record<string, 'processing' | 'ready'>

export default function CreateDailyReportPage() {
  const params = useSearchParams()
  const router = useRouter()

  const projectId = params.get('projectId')

  const [content, setContent] = useState('')
  const [photos, setPhotos] = useState<UploadItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* =========================
   * UX STANDARD
   ========================= */
  const [imageProgress, setImageProgress] = useState<ProgressMap>({})
  const [imageStatus, setImageStatus] = useState<StatusMap>({})
  const [isProcessingImages, setIsProcessingImages] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!projectId) {
    return (
      <div className="p-6 text-red-600">
        Invalid project context.
      </div>
    )
  }

  /* =========================
   * PROGRESS SIMULATION
   ========================= */
  const simulateProgress = (
    id: string,
    setProgress: React.Dispatch<React.SetStateAction<ProgressMap>>,
    setStatus: React.Dispatch<React.SetStateAction<StatusMap>>
  ) => {
    let value = 0
    setStatus(prev => ({ ...prev, [id]: 'processing' }))

    const interval = setInterval(() => {
      value += 10
      setProgress(prev => ({ ...prev, [id]: value }))

      if (value >= 100) {
        clearInterval(interval)
        setStatus(prev => ({ ...prev, [id]: 'ready' }))
      }
    }, 80)
  }

  /* =========================
   * IMAGE PICKER
   ========================= */
  const addPhotos = async (files: FileList | null) => {
    if (!files) return

    setIsProcessingImages(true)

    try {
      for (const original of Array.from(files)) {
        const id = crypto.randomUUID()
        simulateProgress(id, setImageProgress, setImageStatus)

        const compressedBlob = await imageCompression(original, {
          maxWidthOrHeight: 1600,
          initialQuality: 0.75,
          useWebWorker: true,
        })

        const compressedFile = new File(
          [compressedBlob],
          original.name,
          { type: compressedBlob.type }
        )

        setPhotos(prev => [
          ...prev,
          {
            id,
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
            caption: '',
          },
        ])
      }
    } finally {
      setIsProcessingImages(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const updateCaption = (id: string, caption: string) => {
    setPhotos(prev =>
      prev.map(p =>
        p.id === id ? { ...p, caption } : p
      )
    )
  }

  const allReady = Object.values(imageStatus).every(
    v => v === 'ready'
  )

  /* =========================
   * SUBMIT
   ========================= */
  const submit = async () => {
    if (!allReady) return

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

  /* =========================
   * RENDER
   ========================= */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {isProcessingImages && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3 shadow">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            <span className="text-sm font-medium">
              Processing images, please wait…
            </span>
          </div>
        </div>
      )}

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
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => addPhotos(e.target.files)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {photos.map(p => (
            <div
              key={p.id}
              className="relative border rounded-xl p-3 space-y-2"
            >
              <button
                onClick={() => removePhoto(p.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-black text-white rounded-full text-xs"
              >
                ✕
              </button>

              <img
                src={p.preview}
                className="w-full max-h-48 object-cover rounded-lg"
              />

              {imageProgress[p.id] !== undefined && (
                <div className="h-1 bg-gray-200 rounded">
                  <div
                    className="h-1 bg-black rounded"
                    style={{
                      width: `${imageProgress[p.id]}%`,
                    }}
                  />
                </div>
              )}

              <input
                type="text"
                placeholder="Photo caption"
                className="border rounded-lg p-2 w-full text-sm"
                value={p.caption}
                onChange={e =>
                  updateCaption(p.id, e.target.value)
                }
              />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading || !allReady}
        className="bg-black text-white px-6 py-3 rounded-xl disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </div>
  )
}

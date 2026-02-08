'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import imageCompression from 'browser-image-compression'

type Photo = {
  id: string
  url: string
  caption: string
}

type UploadItem = {
  id: string
  file: File
  preview: string
  caption: string
}

type ProgressMap = Record<string, number>
type StatusMap = Record<string, 'processing' | 'ready'>

export default function EditDailyReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const router = useRouter()

  const [content, setContent] = useState('')
  const [rejectNote, setRejectNote] = useState<string | null>(null)

  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([])
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([])

  const [newPhotos, setNewPhotos] = useState<UploadItem[]>([])

  const [imageProgress, setImageProgress] = useState<ProgressMap>({})
  const [imageStatus, setImageStatus] = useState<StatusMap>({})
  const [isProcessingImages, setIsProcessingImages] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /** =========================
   * FETCH DATA
   ========================= */
  useEffect(() => {
    setLoading(true)

    fetch(`/api/manager/reports/daily/${reportId}`)
      .then(res => res.json())
      .then(data => {
        setContent(data.report.content)
        setRejectNote(data.report.rejectNote)
        setExistingPhotos(data.report.photos)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [reportId])

  /** =========================
   * SIMULATED PROGRESS
   ========================= */
  const simulateProgress = (id: string) => {
    let value = 0
    setImageStatus(prev => ({ ...prev, [id]: 'processing' }))

    const interval = setInterval(() => {
      value += 10
      setImageProgress(prev => ({ ...prev, [id]: value }))

      if (value >= 100) {
        clearInterval(interval)
        setImageStatus(prev => ({ ...prev, [id]: 'ready' }))
      }
    }, 80)
  }

  /** =========================
   * ADD NEW PHOTOS
   ========================= */
  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setIsProcessingImages(true)

    try {
      for (const original of Array.from(files)) {
        const id = crypto.randomUUID()
        simulateProgress(id)

        const compressed = await imageCompression(original, {
          maxWidthOrHeight: 1600,
          initialQuality: 0.75,
          useWebWorker: true,
        })

        const preview = URL.createObjectURL(compressed)

        setNewPhotos(prev => [
          ...prev,
          { id, file: compressed, preview, caption: '' },
        ])
      }
    } finally {
      setIsProcessingImages(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /** =========================
   * EXISTING PHOTO HANDLERS
   ========================= */
  const updateExistingCaption = (id: string, caption: string) => {
    setExistingPhotos(prev =>
      prev.map(p => (p.id === id ? { ...p, caption } : p))
    )
  }

  const removeExistingPhoto = (id: string) => {
    setDeletedPhotoIds(prev => [...prev, id])
    setExistingPhotos(prev => prev.filter(p => p.id !== id))
  }

  /** =========================
   * NEW PHOTO HANDLERS
   ========================= */
  const updateNewCaption = (id: string, caption: string) => {
    setNewPhotos(prev =>
      prev.map(p => (p.id === id ? { ...p, caption } : p))
    )
  }

  const removeNewPhoto = (id: string) => {
    setNewPhotos(prev => prev.filter(p => p.id !== id))
    setImageProgress(prev => {
      const x = { ...prev }
      delete x[id]
      return x
    })
    setImageStatus(prev => {
      const x = { ...prev }
      delete x[id]
      return x
    })
  }

  const allReady =
    Object.values(imageStatus).every(v => v === 'ready')

  /** =========================
   * SUBMIT
   ========================= */
  const submit = async () => {
    setError(null)

    if (!content.trim()) {
      setError('Content is required')
      return
    }

    if (!allReady) return

    const fd = new FormData()
    fd.append('content', content)

    existingPhotos.forEach(p => {
      fd.append('existingPhotoIds', p.id)
      fd.append('existingPhotoCaptions', p.caption)
    })

    deletedPhotoIds.forEach(id =>
      fd.append('deletedPhotoIds', id)
    )

    newPhotos.forEach(p => {
      fd.append('photos', p.file)
      fd.append('captions', p.caption)
    })

    const res = await fetch(
      `/api/manager/reports/daily/${reportId}`,
      { method: 'PUT', body: fd }
    )

    if (!res.ok) {
      setError('Failed to resubmit report')
      return
    }

    router.back()
  }

  /* =========================
   * RENDER
   ========================= */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ================= INITIAL LOADING OVERLAY ================= */}
      {loading && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3 shadow">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            <span className="text-sm font-medium">
              Loading report data…
            </span>
          </div>
        </div>
      )}

      {/* ================= IMAGE PROCESSING OVERLAY ================= */}
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

      {/* ================= IMAGE PREVIEW MODAL ================= */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onClick={() => setPreviewImageUrl(null)}
        >
          <img
            src={previewImageUrl}
            className="max-w-[90vw] max-h-[90vh] rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <h1 className="text-2xl font-semibold">
        Edit & Resubmit Report
      </h1>

      {rejectNote && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <strong>Reject Note:</strong> {rejectNote}
        </div>
      )}

      <textarea
        className="border rounded-xl p-3 w-full min-h-[140px]"
        value={content}
        onChange={e => setContent(e.target.value)}
      />

      {/* EXISTING PHOTOS */}
      {existingPhotos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">
            Existing Photos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {existingPhotos.map(p => (
              <div
                key={p.id}
                className="relative border rounded-xl p-3 space-y-2"
              >
                <button
                  onClick={() => removeExistingPhoto(p.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-black text-white rounded-full text-xs"
                >
                  ✕
                </button>

                <img
                  src={p.url}
                  onClick={() => setPreviewImageUrl(p.url)}
                  className="rounded-lg object-cover w-full cursor-pointer"
                />

                <input
                  className="border rounded-lg p-2 w-full text-sm"
                  placeholder="Caption"
                  value={p.caption}
                  onChange={e =>
                    updateExistingCaption(p.id, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW PHOTOS */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
		capture="environment" //tambahan untuk buka kamera
        multiple
        onChange={e => addPhotos(e.target.files)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {newPhotos.map(p => (
          <div
            key={p.id}
            className="relative border rounded-xl p-3 space-y-2"
          >
            <button
              onClick={() => removeNewPhoto(p.id)}
              className="absolute top-2 right-2 w-6 h-6 bg-black text-white rounded-full text-xs"
            >
              ✕
            </button>

            <img
              src={p.preview}
              onClick={() => setPreviewImageUrl(p.preview)}
              className="rounded-lg object-cover w-full cursor-pointer"
            />

            {imageProgress[p.id] !== undefined && (
              <div className="h-1 bg-gray-200 rounded">
                <div
                  className="h-1 bg-black rounded"
                  style={{ width: `${imageProgress[p.id]}%` }}
                />
              </div>
            )}

            <input
              className="border rounded-lg p-2 w-full text-sm"
              placeholder="Caption"
              value={p.caption}
              onChange={e =>
                updateNewCaption(p.id, e.target.value)
              }
            />
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={!allReady}
        className="bg-black text-white px-6 py-3 rounded-xl disabled:opacity-50"
      >
        Resubmit Report
      </button>
    </div>
  )
}

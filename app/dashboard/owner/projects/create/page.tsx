
'use client'

import { useEffect, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'

type UserOption = {
  id: string
  name: string | null
  email: string | null
}

type UploadItem = {
  id: string
  file: File
  preview?: string
  caption: string
}

type ProgressMap = Record<string, number>
type StatusMap = Record<string, 'processing' | 'ready'>

export default function CreateProjectPage() {
  /** =========================
   * STATE (BASELINE – UNCHANGED)
   ========================= */
  const [managers, setManagers] = useState<UserOption[]>([])
  const [customers, setCustomers] = useState<UserOption[]>([])

  const [managerQuery, setManagerQuery] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [managerOpen, setManagerOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)

  const [managerId, setManagerId] = useState('')
  const [customerIds, setCustomerIds] = useState<string[]>([])

  const [images, setImages] = useState<UploadItem[]>([])
  const [files, setFiles] = useState<UploadItem[]>([])

  // ADDITIVE STATE ONLY
  const [imageProgress, setImageProgress] = useState<ProgressMap>({})
  const [fileProgress, setFileProgress] = useState<ProgressMap>({})
  const [imageStatus, setImageStatus] = useState<StatusMap>({})
  const [fileStatus, setFileStatus] = useState<StatusMap>({})

  // UX overlay while processing images BEFORE thumbnails appear
  const [isProcessingImages, setIsProcessingImages] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  })

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /** =========================
   * FETCH INIT DATA
   ========================= */
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setManagers(data.managers || [])
        setCustomers(data.customers || [])
      })
  }, [])

  /** =========================
   * SIMULATED PROGRESS (ADDITIVE)
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

  /** =========================
   * FILE HANDLERS (BASELINE + ADDITIVE)
   ========================= */
  const handleImagePick = async (filesList: FileList | null) => {
    if (!filesList) return
    setIsProcessingImages(true)

    try {
      for (const originalFile of Array.from(filesList)) {
        const id = crypto.randomUUID()
        simulateProgress(id, setImageProgress, setImageStatus)

        const compressed = await imageCompression(originalFile, {
          maxWidthOrHeight: 1600,
          initialQuality: 0.75,
          useWebWorker: true,
        })

        const preview = URL.createObjectURL(compressed)

        setImages(prev => [
          ...prev,
          {
            id,
            file: compressed,
            preview,
            caption: '',
          },
        ])
      }
    } finally {
      setIsProcessingImages(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleFilePick = (filesList: FileList | null) => {
    if (!filesList) return

    for (const file of Array.from(filesList)) {
      const id = crypto.randomUUID()
      simulateProgress(id, setFileProgress, setFileStatus)

      setFiles(prev => [
        ...prev,
        {
          id,
          file,
          caption: '',
        },
      ])
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const allReady =
    Object.values(imageStatus).every(v => v === 'ready') &&
    Object.values(fileStatus).every(v => v === 'ready')

  /** =========================
   * SUBMIT (BASELINE)
   ========================= */
  const submit = async () => {
    if (!allReady) return

    setLoading(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    const startISO = form.startDate
      ? new Date(`${form.startDate}T00:00:00.000Z`).toISOString()
      : ''

    const endISO = form.endDate
      ? new Date(`${form.endDate}T23:59:59.999Z`).toISOString()
      : ''

    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append('startDate', startISO)
    fd.append('endDate', endISO)
    fd.append('managerId', managerId)

    customerIds.forEach(id => fd.append('customerIds', id))

    images.forEach(img => {
      fd.append('images', img.file)
      fd.append('imageCaptions', img.caption)
    })

    files.forEach(f => {
      fd.append('files', f.file)
      fd.append('fileCaptions', f.caption)
    })

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.message || 'Failed to create project')
        return
      }

      setSuccessMsg('✅ Project created successfully')
      setImages([])
      setFiles([])
      setCustomerIds([])
      setCustomerQuery('')
      setManagerId('')
      setManagerQuery('')
      setForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
      })
    } catch {
      setErrorMsg('Unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  /** =========================
   * RENDER (100% BASELINE UI)
   ========================= */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
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

      <h1 className="text-2xl font-semibold">Create New Project</h1>

      {/* PROJECT INFO */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Project Name</label>
        <input
          className="w-full border rounded-xl p-3"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="w-full border rounded-xl p-3"
          value={form.description}
          onChange={e =>
            setForm({ ...form, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Date</label>
          <input
            type="date"
            className="w-full border rounded-xl p-3"
            value={form.startDate}
            onChange={e =>
              setForm({ ...form, startDate: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <input
            type="date"
            className="w-full border rounded-xl p-3"
            value={form.endDate}
            onChange={e =>
              setForm({ ...form, endDate: e.target.value })
            }
          />
        </div>
      </div>

      {/* MANAGER PICK */}
      <div className="space-y-2 relative">
        <label className="text-sm font-medium">Project Manager</label>
        <input
          className="w-full border rounded-xl p-3"
          value={managerQuery}
          onChange={e => {
            setManagerQuery(e.target.value)
            setManagerOpen(true)
          }}
          onFocus={() => setManagerOpen(true)}
        />

        {managerOpen && (
          <div className="absolute z-20 w-full bg-white border rounded-xl max-h-60 overflow-auto">
            {managers
              .filter(m =>
                (m.name || m.email || '')
                  .toLowerCase()
                  .includes(managerQuery.toLowerCase())
              )
              .map(m => (
                <div
                  key={m.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setManagerId(m.id)
                    setManagerQuery(m.name || m.email || '')
                    setManagerOpen(false)
                  }}
                >
                  {m.name || m.email}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* CUSTOMER PICK */}
      <div className="space-y-2 relative">
        <label className="text-sm font-medium">Customers</label>
        <input
          className="w-full border rounded-xl p-3"
          value={customerQuery}
          onChange={e => {
            setCustomerQuery(e.target.value)
            setCustomerOpen(true)
          }}
          onFocus={() => setCustomerOpen(true)}
        />

        {customerOpen && (
          <div className="absolute z-20 w-full bg-white border rounded-xl max-h-60 overflow-auto">
            {customers
              .filter(c => !customerIds.includes(c.id))
              .filter(c =>
                (c.name || c.email || '')
                  .toLowerCase()
                  .includes(customerQuery.toLowerCase())
              )
              .map(c => (
                <div
                  key={c.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setCustomerIds(prev => [...prev, c.id])
                    setCustomerQuery('')
                    setCustomerOpen(false)
                  }}
                >
                  {c.name || c.email}
                </div>
              ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          {customerIds.map(id => {
            const c = customers.find(x => x.id === id)
            if (!c) return null
            return (
              <div
                key={id}
                className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm"
              >
                {c.name || c.email}
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() =>
                    setCustomerIds(prev => prev.filter(x => x !== id))
                  }
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* UPLOAD IMAGES */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Project Images</label>
        <input
          ref={imageInputRef}
          type="file"
		  capture="environment" //tambahan untuk buka kamera
          multiple
          accept="image/*"
          onChange={e => handleImagePick(e.target.files)}
        />

        <div className="grid grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} className="border rounded-xl p-2 space-y-2">
              <img
                src={img.preview}
                className="w-full h-32 object-cover rounded"
              />

              {imageProgress[img.id] !== undefined && (
                <div className="h-1 bg-gray-200 rounded">
                  <div
                    className="h-1 bg-black rounded"
                    style={{ width: `${imageProgress[img.id]}%` }}
                  />
                </div>
              )}

              <input
                className="w-full border rounded p-1 text-sm"
                placeholder="Caption"
                value={img.caption}
                onChange={e =>
                  setImages(prev =>
                    prev.map(i =>
                      i.id === img.id
                        ? { ...i, caption: e.target.value }
                        : i
                    )
                  )
                }
              />
              <button
                className="text-red-600 text-xs"
                onClick={() =>
                  setImages(prev => prev.filter(i => i.id !== img.id))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* UPLOAD FILES */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Project Documents</label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={e => handleFilePick(e.target.files)}
        />

        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className="border rounded-xl p-2 space-y-1">
              <div className="text-sm break-words">{f.file.name}</div>

              {fileProgress[f.id] !== undefined && (
                <div className="h-1 bg-gray-200 rounded">
                  <div
                    className="h-1 bg-black rounded"
                    style={{ width: `${fileProgress[f.id]}%` }}
                  />
                </div>
              )}

              <input
                className="w-full border rounded p-1 text-sm"
                placeholder="Caption"
                value={f.caption}
                onChange={e =>
                  setFiles(prev =>
                    prev.map(x =>
                      x.id === f.id
                        ? { ...x, caption: e.target.value }
                        : x
                    )
                  )
                }
              />
              <button
                className="text-red-600 text-xs"
                onClick={() =>
                  setFiles(prev => prev.filter(x => x.id !== f.id))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SUBMIT */}
      <button
        onClick={submit}
        disabled={loading || !allReady}
        className="w-full bg-black text-white rounded-xl py-3 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Project'}
      </button>

      {successMsg && (
        <p className="text-green-600 text-sm">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="text-red-600 text-sm">{errorMsg}</p>
      )}
    </div>
  )
}

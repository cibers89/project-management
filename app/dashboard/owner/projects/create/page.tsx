'use client'

import { useEffect, useRef, useState } from 'react'

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

export default function CreateProjectPage() {
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

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setManagers(data.managers || [])
        setCustomers(data.customers || [])
      })
  }, [])

  const handleImagePick = (filesList: FileList | null) => {
    if (!filesList) return

    const newItems: UploadItem[] = Array.from(filesList).map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }))

    setImages(prev => [...prev, ...newItems])
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleFilePick = (filesList: FileList | null) => {
    if (!filesList) return

    const newItems: UploadItem[] = Array.from(filesList).map(file => ({
      id: crypto.randomUUID(),
      file,
      caption: '',
    }))

    setFiles(prev => [...prev, ...newItems])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submit = async () => {
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

      setForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
      })
      setManagerId('')
      setManagerQuery('')
      setCustomerIds([])
      setCustomerQuery('')
      setImages([])
      setFiles([])
    } catch {
      setErrorMsg('Unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-semibold">Create New Project</h1>

      {/* PROJECT INFO */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Project Name</label>
          <input
            className="w-full border rounded-xl p-3"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="w-full border rounded-xl p-3"
            value={form.description}
            onChange={e =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>
      </div>

      {/* DATES */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Start Date</label>
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
          <label className="block text-sm font-medium">End Date</label>
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

      {/* MANAGER */}
      <div className="space-y-2 relative">
        <label className="block text-sm font-medium">Project Manager</label>
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
            {managers.map(m => (
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

      {/* CUSTOMERS */}
      <div className="space-y-2 relative">
        <label className="block text-sm font-medium">Customers</label>
        <input
          className="w-full border rounded-xl p-3"
          value={customerQuery}
          onChange={e => {
            setCustomerQuery(e.target.value)
            setCustomerOpen(true)
          }}
          onFocus={() => setCustomerOpen(true)}
        />
      </div>

      {/* IMAGES */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Project Images</label>
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          className="block"
          onChange={e => handleImagePick(e.target.files)}
        />
      </div>

      {/* FILES */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Project Documents</label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="block"
          onChange={e => handleFilePick(e.target.files)}
        />
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full bg-black text-white rounded-xl py-3"
      >
        {loading ? 'Creating...' : 'Create Project'}
      </button>

      {successMsg && <p className="text-green-600">{successMsg}</p>}
      {errorMsg && <p className="text-red-600">{errorMsg}</p>}
    </div>
  )
}

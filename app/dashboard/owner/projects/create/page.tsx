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

  /* =========================
   * FETCH DATA
   ========================= */
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setManagers(data.managers || [])
        setCustomers(data.customers || [])
      })
  }, [])

  /* =========================
   * FILE HANDLERS
   ========================= */
  const handleImagePick = (list: FileList | null) => {
    if (!list) return
    const items = Array.from(list).map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }))
    setImages(prev => [...prev, ...items])
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleFilePick = (list: FileList | null) => {
    if (!list) return
    const items = Array.from(list).map(file => ({
      id: crypto.randomUUID(),
      file,
      caption: '',
    }))
    setFiles(prev => [...prev, ...items])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* =========================
   * SUBMIT
   ========================= */
  const submit = async () => {
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append(
      'startDate',
      form.startDate
        ? new Date(`${form.startDate}T00:00:00Z`).toISOString()
        : ''
    )
    fd.append(
      'endDate',
      form.endDate
        ? new Date(`${form.endDate}T23:59:59Z`).toISOString()
        : ''
    )
    fd.append('managerId', managerId)

    customerIds.forEach(id => fd.append('customerIds', id))
    images.forEach(i => {
      fd.append('images', i.file)
      fd.append('imageCaptions', i.caption)
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
      setForm({ name: '', description: '', startDate: '', endDate: '' })
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

      {/* INFO */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Project Name</label>
          <input
            className="w-full border rounded-xl p-3"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
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
        {(['startDate', 'endDate'] as const).map(k => (
          <div key={k}>
            <label className="block text-sm font-medium">
              {k === 'startDate' ? 'Start Date' : 'End Date'}
            </label>
            <input
              type="date"
              className="w-full border rounded-xl p-3"
              value={form[k]}
              onChange={e => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
      </div>

      {/* MANAGER */}
      <div className="relative">
        <label className="block text-sm font-medium">Project Manager</label>
        <input
          className="w-full border rounded-xl p-3"
          value={managerQuery}
          onFocus={() => setManagerOpen(true)}
          onChange={e => {
            setManagerQuery(e.target.value)
            setManagerOpen(true)
          }}
        />
        {managerOpen && (
          <div className="absolute z-30 w-full bg-white border rounded-xl max-h-60 overflow-auto">
            {managers.map(m => (
              <div
                key={m.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onPointerDown={() => {
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
      <div className="relative space-y-2">
        <label className="block text-sm font-medium">Customers</label>
        <input
          className="w-full border rounded-xl p-3"
          value={customerQuery}
          onFocus={() => setCustomerOpen(true)}
          onChange={e => {
            setCustomerQuery(e.target.value)
            setCustomerOpen(true)
          }}
        />

        {customerOpen && (
          <div className="absolute z-30 w-full bg-white border rounded-xl max-h-60 overflow-auto">
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
                  onPointerDown={() => {
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

        {/* PICKED CUSTOMERS */}
        <div className="flex flex-wrap gap-2">
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
                    setCustomerIds(prev =>
                      prev.filter(x => x !== id)
                    )
                  }
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* IMAGE PICKER (CAMERA) */}
      <div>
        <label className="block text-sm font-medium">Project Images</label>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={e => handleImagePick(e.target.files)}
        />
      </div>

      {/* FILE PICKER */}
      <div>
        <label className="block text-sm font-medium">
          Project Documents
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
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

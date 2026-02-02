'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type UserOption = {
  id: string
  name: string | null
  email: string | null
}

type UploadItem = {
  id: string
  file?: File
  preview?: string
  caption: string
  existingUrl?: string
}

export default function EditProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()

  /* =========================
   * STATE
   ========================= */
  const [managers, setManagers] = useState<UserOption[]>([])
  const [customers, setCustomers] = useState<UserOption[]>([])

  const [managerQuery, setManagerQuery] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [managerOpen, setManagerOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)

  const [managerId, setManagerId] = useState('')
  const [customerIds, setCustomerIds] = useState<string[]>([])

  const [existingImages, setExistingImages] = useState<UploadItem[]>([])
  const [newImages, setNewImages] = useState<UploadItem[]>([])
  const [existingFiles, setExistingFiles] = useState<UploadItem[]>([])
  const [newFiles, setNewFiles] = useState<UploadItem[]>([])

  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /* =========================
   * INIT LOAD
   ========================= */
  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch(`/api/projects/owner/${projectId}`).then(r => r.json()),
    ]).then(([meta, detail]) => {
      setManagers(meta.managers || [])
      setCustomers(meta.customers || [])

      const p = detail.project

      setForm({
        name: p.name || '',
        description: p.description || '',
        startDate: p.startDate?.slice(0, 10) || '',
        endDate: p.endDate?.slice(0, 10) || '',
      })

      setManagerId(p.managerId)
      setManagerQuery(p.manager?.name || p.manager?.email || '')

      setCustomerIds(p.customers.map((c: any) => c.customerId))

      const files = Array.isArray(p.files) ? p.files : []

		setExistingImages(
		  files
			.filter((f: any) => f.type === 'IMAGE')
			.map((f: any) => ({
			  id: crypto.randomUUID(),
			  caption: f.caption || '',
			  existingUrl: f.url,
			}))
		)

		setExistingFiles(
		  files
			.filter((f: any) => f.type === 'DOCUMENT')
			.map((f: any) => ({
			  id: crypto.randomUUID(),
			  caption: f.caption || '',
			  existingUrl: f.url,
			}))
		)

    })
  }, [projectId])

  /* =========================
   * FILE PICKERS
   ========================= */
  const pickImages = (list: FileList | null) => {
    if (!list) return
    const items = Array.from(list).map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }))
    setNewImages(prev => [...prev, ...items])
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const pickFiles = (list: FileList | null) => {
    if (!list) return
    const items = Array.from(list).map(file => ({
      id: crypto.randomUUID(),
      file,
      caption: '',
    }))
    setNewFiles(prev => [...prev, ...items])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* =========================
   * SUBMIT (PUT)
   ========================= */
  const submit = async () => {
    setLoading(true)
    setErrorMsg(null)

    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append('startDate', form.startDate)
    fd.append('endDate', form.endDate)
    fd.append('managerId', managerId)

    customerIds.forEach(id => fd.append('customerIds', id))

    existingImages.forEach(i =>
      fd.append('existingImages', i.existingUrl!)
    )
    newImages.forEach(i => {
      fd.append('images', i.file!)
      fd.append('imageCaptions', i.caption)
    })

    existingFiles.forEach(f =>
      fd.append('existingFiles', f.existingUrl!)
    )
    newFiles.forEach(f => {
      fd.append('files', f.file!)
      fd.append('fileCaptions', f.caption)
    })

    const res = await fetch(`/api/projects/owner/${projectId}`, {
      method: 'PUT',
      body: fd,
    })

    if (!res.ok) {
      const d = await res.json()
      setErrorMsg(d.message || 'Failed to update project')
      setLoading(false)
      return
    }

    router.push(`/dashboard/owner/projects/${projectId}`)
  }

  /* =========================
   * RENDER (SAMA DENGAN CREATE)
   ========================= */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Edit Project</h1>

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

      {/* IMAGE PICKER */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Project Images</label>
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={e => pickImages(e.target.files)}
        />

        <div className="grid grid-cols-3 gap-3">
          {[...existingImages, ...newImages].map(img => (
            <div key={img.id} className="border rounded-xl p-2 space-y-2">
              <img
                src={img.preview || img.existingUrl}
                className="w-full h-32 object-cover rounded"
              />
              <input
                className="w-full border rounded p-1 text-sm"
                placeholder="Caption"
                value={img.caption}
                onChange={e => {
                  const fn = img.existingUrl
                    ? setExistingImages
                    : setNewImages
                  fn(prev =>
                    prev.map(i =>
                      i.id === img.id
                        ? { ...i, caption: e.target.value }
                        : i
                    )
                  )
                }}
              />
              <button
                className="text-red-600 text-xs"
                onClick={() => {
                  const fn = img.existingUrl
                    ? setExistingImages
                    : setNewImages
                  fn(prev => prev.filter(i => i.id !== img.id))
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FILE PICKER */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Project Documents</label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={e => pickFiles(e.target.files)}
        />

        <div className="space-y-2">
          {[...existingFiles, ...newFiles].map(f => (
            <div key={f.id} className="border rounded-xl p-2 space-y-1">
              <div className="text-sm break-words">
                {f.file?.name || f.existingUrl}
              </div>
              <input
                className="w-full border rounded p-1 text-sm"
                placeholder="Caption"
                value={f.caption}
                onChange={e => {
                  const fn = f.existingUrl
                    ? setExistingFiles
                    : setNewFiles
                  fn(prev =>
                    prev.map(i =>
                      i.id === f.id
                        ? { ...i, caption: e.target.value }
                        : i
                    )
                  )
                }}
              />
              <button
                className="text-red-600 text-xs"
                onClick={() => {
                  const fn = f.existingUrl
                    ? setExistingFiles
                    : setNewFiles
                  fn(prev => prev.filter(i => i.id !== f.id))
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full bg-black text-white rounded-xl py-3 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>

      {errorMsg && (
        <p className="text-red-600 text-sm">{errorMsg}</p>
      )}
    </div>
  )
}

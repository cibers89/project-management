'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type UserRole =
  | 'ADMIN'
  | 'PROJECT_OWNER'
  | 'PROJECT_MANAGER'
  | 'CUSTOMER'

type User = {
  id: string
  name: string | null
  email: string | null
  role: UserRole
  createdAt: string
}

const PAGE_SIZE = 10

export default function AdminDashboardPage() {
  const pathname = usePathname()

  /* ================= SIDEBAR ================= */
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* ================= USERS ================= */
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /* ================= CREATE ================= */
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'CUSTOMER' as UserRole,
  })

  /* ================= EDIT ================= */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'CUSTOMER' as UserRole,
  })

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* ================= LOAD ================= */
  const loadUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(Array.isArray(data.users) ? data.users : [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  /* ================= FILTER + PAGINATION ================= */
  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      `${u.name ?? ''} ${u.email ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  }, [users, search])

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE)

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  useEffect(() => {
    setPage(1)
  }, [search])

  /* ================= CREATE ================= */
  const createUser = async () => {
    setError(null)
    setMessage(null)

    if (!createForm.email.trim()) {
      setError('Email is required')
      return
    }

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.message || 'Failed to create user')
      return
    }

    setMessage('🎉 User created')
    setShowCreate(false)
    setCreateForm({ name: '', email: '', role: 'CUSTOMER' })
    loadUsers()
  }

  /* ================= EDIT ================= */
  const startEdit = (u: User) => {
    setEditingId(u.id)
    setEditForm({
      name: u.name ?? '',
      email: u.email ?? '',
      role: u.role,
    })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (userId: string) => {
    setError(null)
    setMessage(null)

    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...editForm }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.message || 'Failed to update user')
      return
    }

    setMessage('✅ User updated')
    setEditingId(null)
    loadUsers()
  }

  /* ================= DELETE ================= */
  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user?')) return

    const res = await fetch(`/api/admin/users?userId=${userId}`, {
      method: 'DELETE',
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.message || 'Failed to delete user')
      return
    }

    setMessage('🗑 User deleted')
    loadUsers()
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`bg-black text-white ${
          sidebarOpen ? 'w-64' : 'w-16'
        } transition-all sticky top-0 h-screen flex-shrink-0`}
      >
        <div className="flex justify-between items-center p-4">
          {sidebarOpen && <b>ADMIN</b>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '«' : '»'}
          </button>
        </div>

        <nav className="space-y-1 px-2">
          <Link
            href="/dashboard/admin"
            className={`block px-3 py-2 rounded ${
              pathname === '/dashboard/admin'
                ? 'bg-white text-black'
                : 'hover:bg-gray-800'
            }`}
          >
            👥 {sidebarOpen && 'Users'}
          </Link>

          <Link
            href="/dashboard/admin/audit-trail"
            className={`block px-3 py-2 rounded ${
              pathname === '/dashboard/admin/audit-trail'
                ? 'bg-white text-black'
                : 'hover:bg-gray-800'
            }`}
          >
            ⚙️ {sidebarOpen && 'Audit Trail'}
          </Link>
        </nav>
      </aside>

      {/* ================= CONTENT ================= */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between gap-3">
          <h1 className="text-2xl font-semibold">User Management</h1>

          <div className="flex gap-2">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-black text-white rounded-xl px-4"
            >
              ➕
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-3">
            <input
              placeholder="Name"
              className="border rounded-xl p-2 w-full"
              value={createForm.name}
              onChange={e =>
                setCreateForm(f => ({ ...f, name: e.target.value }))
              }
            />
            <input
              placeholder="Email"
              className="border rounded-xl p-2 w-full"
              value={createForm.email}
              onChange={e =>
                setCreateForm(f => ({ ...f, email: e.target.value }))
              }
            />
            <select
              className="border rounded-xl p-2 w-full"
              value={createForm.role}
              onChange={e =>
                setCreateForm(f => ({
                  ...f,
                  role: e.target.value as UserRole,
                }))
              }
            >
              <option value="ADMIN">ADMIN</option>
              <option value="PROJECT_OWNER">PROJECT_OWNER</option>
              <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={createUser}
                className="bg-green-600 text-white rounded-xl px-4 py-2"
              >
                💾
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="border rounded-xl px-4 py-2"
              >
                ✖
              </button>
            </div>
          </div>
        )}

        <div className="md:hidden space-y-4">
          {paginatedUsers.map(u => {
            const isEditing = editingId === u.id

            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl shadow p-4 space-y-3"
              >
                {isEditing ? (
                  <>
                    <input
                      className="border rounded-xl p-2 w-full"
                      value={editForm.name}
                      onChange={e =>
                        setEditForm(f => ({
                          ...f,
                          name: e.target.value,
                        }))
                      }
                    />
                    <input
                      className="border rounded-xl p-2 w-full"
                      value={editForm.email}
                      onChange={e =>
                        setEditForm(f => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                    />
                    <select
                      className="border rounded-xl p-2 w-full"
                      value={editForm.role}
                      onChange={e =>
                        setEditForm(f => ({
                          ...f,
                          role: e.target.value as UserRole,
                        }))
                      }
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="PROJECT_OWNER">PROJECT_OWNER</option>
                      <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                      <option value="CUSTOMER">CUSTOMER</option>
                    </select>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(u.id)}
                        className="flex-1 bg-black text-white rounded-xl py-2"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 border rounded-xl py-2"
                      >
                        ✖ Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <b>{u.name || '-'}</b>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {u.role}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 break-words">
                      {u.email}
                    </div>

                    <div className="text-xs text-gray-400">
                      Created:{' '}
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="flex-1 border rounded-xl py-2"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="flex-1 border border-red-300 text-red-600 rounded-xl py-2"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded ${
                  page === i + 1
                    ? 'bg-black text-white'
                    : 'border'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type DemoUser = {
  email: string
  name: string | null
  role: string
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<DemoUser[]>([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* =======================
   * LOAD DEMO USERS
   ======================= */
  useEffect(() => {
    fetch('/api/demo-users')
      .then(res => res.json())
      .then(setUsers)
      .catch(() => setError('Failed to load demo users'))
  }, [])

  /* =======================
   * LOGIN HANDLER
   ======================= */
  const loginDemo = async () => {
    if (!selectedEmail) {
      setError('Please select a demo user')
      return
    }

    setLoading(true)
    setError(null)

    const res = await signIn('credentials', {
      email: selectedEmail,
      redirect: false,
    })

    if (res?.error) {
      setError('Login failed')
      setLoading(false)
      return
    }

    // 🔑 GET SESSION → REDIRECT BASED ON ROLE
    const session = await getSession()

    if (!session?.user?.role) {
      setError('Role not found')
      setLoading(false)
      return
    }

    switch (session.user.role) {
      case 'ADMIN':
        router.push('/dashboard/admin')
        break

      case 'PROJECT_MANAGER':
        router.push('/dashboard/manager')
        break

      case 'CUSTOMER':
        router.push('/dashboard/customer')
        break

      case 'PROJECT_OWNER':
        router.push('/dashboard/owner')
        break

      default:
        // fallback safety
        router.push('/')
        break
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">
          Demo Login
        </h1>

        {/* DEMO USER DROPDOWN */}
        <select
          className="w-full border rounded-xl p-3"
          value={selectedEmail}
          onChange={e => setSelectedEmail(e.target.value)}
        >
          <option value="">Select demo user</option>
          {users.map(u => (
            <option key={u.email} value={u.email}>
              {u.name || u.email} ({u.role})
            </option>
          ))}
        </select>

        <button
          onClick={loginDemo}
          disabled={loading}
          className="w-full bg-black text-white rounded-xl p-3 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Login as Demo User'}
        </button>

        <div className="text-center text-sm text-gray-400">
          or
        </div>

        <button
          onClick={() => signIn('github')}
          className="w-full border rounded-xl p-3"
        >
          Login with GitHub
        </button>

        {error && (
          <p className="text-sm text-red-600 text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

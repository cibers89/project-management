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

  useEffect(() => {
    fetch('/api/demo-users')
      .then(res => res.json())
      .then(setUsers)
      .catch(() => setError('Failed to load demo users'))
  }, [])

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
        router.push('/')
        break
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 px-4">
      <div className="w-full max-w-md">
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Project Management System
            </h1>
            <p className="text-sm text-gray-500">
              Secure access for internal demo & stakeholders
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Demo Account
            </label>
            <select
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              value={selectedEmail}
              onChange={e => setSelectedEmail(e.target.value)}
            >
              <option value="">Select demo user</option>
              {users.map(u => (
                <option key={u.email} value={u.email}>
                  {u.name || u.email} — {u.role}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loginDemo}
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Continue as Demo User'}
          </button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            onClick={() => signIn('github')}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Login with GitHub
          </button>

          {error ? (
            <p className="text-sm text-red-600 text-center">
              {error}
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Internal Demo Environment
        </p>
      </div>
    </div>
  )
}

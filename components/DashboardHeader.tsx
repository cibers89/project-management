'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function DashboardHeader() {
  const { data: session } = useSession()

  const role = session?.user?.role

  const homePath =
    role === 'ADMIN'
      ? '/dashboard/admin'
      : role === 'PROJECT_MANAGER'
      ? '/dashboard/manager'
      : role === 'CUSTOMER'
      ? '/dashboard/customer'
      : '/dashboard/owner'

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-4">
          <Link
            href={homePath}
            className="font-semibold text-lg"
          >
            Dashboard
          </Link>

          {/* ✅ OWNER ONLY: CREATE PROJECT */}
          {role === 'PROJECT_OWNER' && (
            <Link
              href="/dashboard/owner/projects/create"
              className="
                inline-flex items-center gap-2
                px-4 py-2 rounded-xl
                bg-black text-white text-sm
                hover:bg-gray-800
                transition
              "
            >
              ➕ Create Project
            </Link>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          <Link
            href={homePath}
            className="text-sm text-gray-600 hover:text-black"
          >
            Home
          </Link>

          <button
            onClick={() =>
              signOut({ callbackUrl: '/login' })
            }
            className="text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

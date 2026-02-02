'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

export default function LogoutPage() {
  useEffect(() => {
    signOut({
      redirect: true,
      callbackUrl: '/login',
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-600">Signing you out…</p>
    </div>
  )
}

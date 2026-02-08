'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardHeader from '@/components/DashboardHeader'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = useSession()?.data
  const router = useRouter()

  useEffect(() => {
    if (!session) return
    if (!session.user?.role) {
      router.replace('/unauthorized')
    }
  }, [session, router])

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <main className="pt-4">{children}</main>
    </div>
  )
}

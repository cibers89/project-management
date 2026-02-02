import DashboardHeader from '@/components/DashboardHeader'
export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <main className="pt-4">{children}</main>
    </div>
  )
}

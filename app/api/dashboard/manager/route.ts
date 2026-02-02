import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportStatus } from '@prisma/client'

export async function GET() {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const managerId = session.user.id
  const now = new Date()

  const [
    totalAssigned,
    onProgressProjects,
    overdueProjects,
    reportsNeedAction,
  ] = await Promise.all([
    // 1️⃣ Total assigned projects
    prisma.project.count({
      where: { managerId },
    }),

    // 2️⃣ On progress projects (NOT done yet)
    prisma.project.count({
      where: {
        managerId,
        isDone: false,
      },
    }),

    // 3️⃣ Overdue projects
    prisma.project.count({
      where: {
        managerId,
        isDone: false,
        endDate: { lt: now },
      },
    }),

    // 4️⃣ Reports need action (REJECTED)
    prisma.dailyReport.count({
      where: {
        createdById: managerId,
        status: ReportStatus.REJECTED,
      },
    }),
  ])

  return NextResponse.json({
    totalAssigned,
    onProgressProjects,
    overdueProjects,
    reportsNeedAction,
  })
}

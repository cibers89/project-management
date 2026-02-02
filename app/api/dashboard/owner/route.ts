import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportStatus } from '@prisma/client'

export async function GET() {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const ownerId = session.user.id
  const now = new Date()

  const [
    totalProject,
    ongoingProject,
    finishedProject,
    overdueProject,
    pendingDaily,
    pendingWeekly,
    pendingMonthly,
  ] = await Promise.all([
    prisma.project.count({ where: { ownerId } }),

    prisma.project.count({
      where: {
        ownerId,
        isDone: false,
        endDate: { gte: now },
      },
    }),

    prisma.project.count({
      where: {
        ownerId,
        isDone: true,
      },
    }),

    prisma.project.count({
      where: {
        ownerId,
        isDone: false,
        endDate: { lt: now },
      },
    }),

    prisma.dailyReport.count({
      where: {
        status: ReportStatus.SUBMITTED,
        project: { ownerId },
      },
    }),

    prisma.weeklyReport.count({
      where: {
        status: ReportStatus.SUBMITTED,
        project: { ownerId },
      },
    }),

    prisma.monthlyReport.count({
      where: {
        status: ReportStatus.SUBMITTED,
        project: { ownerId },
      },
    }),
  ])

  return NextResponse.json({
    totalProject,
    ongoingProject,
    finishedProject,
    overdueProject,
    pendingApproval:
      pendingDaily + pendingWeekly + pendingMonthly,
  })
}

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

  const daily = await prisma.dailyReport.findMany({
    where: {
      status: ReportStatus.SUBMITTED,
      project: { ownerId },
    },
    include: {
      project: {
        include: {
          customers: {
            include: {
              customer: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  })

  const weekly = await prisma.weeklyReport.findMany({
    where: {
      status: ReportStatus.SUBMITTED,
      project: { ownerId },
    },
    include: {
      project: {
        include: {
          customers: {
            include: {
              customer: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  })

  const monthly = await prisma.monthlyReport.findMany({
    where: {
      status: ReportStatus.SUBMITTED,
      project: { ownerId },
    },
    include: {
      project: {
        include: {
          customers: {
            include: {
              customer: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  })

  const map = (
    list: any[],
    type: 'daily' | 'weekly' | 'monthly'
  ) =>
    list.map(r => ({
      reportId: r.id,
      reportType: type,
      submittedAt: r.createdAt,
      project: {
        name: r.project.name,
        startDate: r.project.startDate,
        endDate: r.project.endDate,
        customers: r.project.customers.map(
          (c: any) => c.customer
        ),
      },
    }))

  return NextResponse.json({
    reports: [
      ...map(daily, 'daily'),
      ...map(weekly, 'weekly'),
      ...map(monthly, 'monthly'),
    ],
  })
}

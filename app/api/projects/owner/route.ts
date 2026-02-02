import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const now = new Date()

  let where: any = {
    ownerId: session.user.id,
  }

  if (status === 'ongoing') {
    where.isDone = false
    where.endDate = { gte: now }
  }

  if (status === 'finished') {
    where.isDone = true
  }

  if (status === 'overdue') {
    where.isDone = false
    where.endDate = { lt: now }
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      manager: {
        select: { name: true, email: true },
      },
      customers: {
        include: {
          customer: {
            select: { name: true, email: true },
          },
        },
      },

      dailyReports: {
        orderBy: { reportDate: 'desc' },
        take: 1,
        select: {
          reportDate: true,
          photos: {
            orderBy: { createdAt: 'asc' },
            select: { url: true },
          },
        },
      },

      ratings: {
        include: {
          customer: {
            select: { name: true, email: true },
          },
        },
      },

      _count: {
        select: {
          dailyReports: true,
          weeklyReports: true,
          monthlyReports: true,
        },
      },
    },
  })

  const mapped = projects.map(p => {
    const latestReportDate =
      p.dailyReports[0]?.reportDate?.toISOString() ?? null

    let ratingSummary = null

    if (p.isDone && p.ratings.length > 0) {
      const total = p.ratings.reduce((sum, r) => sum + r.rating, 0)

      ratingSummary = {
        average: total / p.ratings.length,
        count: p.ratings.length,
        feedbacks: p.ratings
          .filter(r => r.feedback)
          .map(r => ({
            id: r.id,
            rating: r.rating,
            feedback: r.feedback,
            customerName: r.customer.name || r.customer.email,
          })),
      }
    }

    return {
      id: p.id,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      isDone: p.isDone,

      manager: p.manager,
      customers: p.customers.map(c => c.customer),

      reportCount: p._count,

      highlightPhoto: p.dailyReports[0]?.photos[0]?.url ?? null,
      hasPhoto: !!p.dailyReports[0]?.photos[0],

      latestReportDate,
      ratingSummary,
    }
  })

  /**
   * ======================================================
   * SORTING
   * 1. Latest report DESC (paling baru di atas)
   * 2. Yang punya report di atas yang tidak punya
   * ======================================================
   */
  mapped.sort((a, b) => {
    if (a.latestReportDate && b.latestReportDate) {
      return (
        new Date(b.latestReportDate).getTime() -
        new Date(a.latestReportDate).getTime()
      )
    }
    if (a.latestReportDate) return -1
    if (b.latestReportDate) return 1
    return 0
  })

  return NextResponse.json({ projects: mapped })
}

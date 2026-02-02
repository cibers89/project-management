import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter')
  const now = new Date()

  /**
   * ======================================================
   * FETCH PROJECTS VIA RELATION (CUSTOMER)
   * ======================================================
   */
  const relations = await prisma.projectCustomer.findMany({
    where: {
      customerId: session.user.id,
      ...(filter === 'overdue'
        ? {
            project: {
              isDone: false,
              endDate: { lt: now },
            },
          }
        : {}),
    },
    include: {
      project: {
        include: {
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
      },
    },
  })

  /**
   * ======================================================
   * MAP & ENRICH DATA
   * ======================================================
   */
  const mapped = relations.map(r => {
    const project = r.project
    const latestReport = project.dailyReports[0]

    let ratingSummary = null

    if (project.isDone && project.ratings.length > 0) {
      const total = project.ratings.reduce(
        (sum, r) => sum + r.rating,
        0
      )

      ratingSummary = {
        average: total / project.ratings.length,
        count: project.ratings.length,
        feedbacks: project.ratings
          .filter(r => r.feedback)
          .map(r => ({
            id: r.id,
            rating: r.rating,
            feedback: r.feedback,
            customerName:
              r.customer.name || r.customer.email,
          })),
      }
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      isDone: project.isDone,

      highlightPhoto: latestReport?.photos[0]?.url ?? null,
      latestReportDate:
        latestReport?.reportDate?.toISOString() ?? null,

      reportCount: project._count,
      ratingSummary,
    }
  })

  /**
   * ======================================================
   * SORTING
   * 1. Latest report DESC
   * 2. Yang punya report di atas
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

  return NextResponse.json({
    projects: mapped,
  })
}

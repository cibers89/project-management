import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  /* =======================
   * AUTH
   ======================= */
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  /* =======================
   * PARAMS (Next.js 15+)
   ======================= */
  const { projectId } = await context.params

  /* =======================
   * QUERY
   ======================= */
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      managerId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      isDone: true,

      /* ===== CUSTOMERS ===== */
      customers: {
        select: {
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },

      /* ===== PROJECT FILES (IMAGE + DOCUMENT) ===== */
      files: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          url: true,
          fileName: true,
          caption: true,
          type: true, // IMAGE | DOCUMENT
        },
      },

      /* ===== DAILY REPORTS ===== */
      dailyReports: {
        orderBy: {
          reportDate: 'desc',
        },
        select: {
          id: true,
          content: true,
          reportDate: true,
          status: true,
          rejectNote: true,

          photos: {
            select: {
              id: true,
              url: true,
              caption: true,
            },
          },
        },
      },
    },
  })

  /* =======================
   * NOT FOUND
   ======================= */
  if (!project) {
    return NextResponse.json(
      { message: 'Project not found' },
      { status: 404 }
    )
  }

  /* =======================
   * RESPONSE
   ======================= */
  return NextResponse.json({ project })
}

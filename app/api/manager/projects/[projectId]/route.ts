import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  // ✅ WAJIB await params (Next.js 15+ / 16)
  const { projectId } = await context.params

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      managerId: session.user.id,
    },
    include: {
      customers: {
        include: {
          customer: true,
        },
      },
      dailyReports: {
        orderBy: { reportDate: 'desc' },
        include: {
          photos: true,
        },
      },
    },
  })

  if (!project) {
    return NextResponse.json(
      { message: 'Project not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ project })
}

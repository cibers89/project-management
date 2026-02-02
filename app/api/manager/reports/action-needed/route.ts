import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const reports = await prisma.dailyReport.findMany({
    where: {
      createdById: session.user.id,
      status: 'REJECTED',
    },
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      project: {
        include: {
          customers: {
            include: {
              customer: true,
            },
          },
        },
      },
      photos: true,
    },
  })

  return NextResponse.json({ reports })
}

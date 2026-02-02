import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * ======================================================
 * GET — AUDIT LOG LIST (ADMIN)
 * ======================================================
 * Query params:
 * - page (default: 1)
 * - pageSize (default: 20)
 * ======================================================
 */
export async function GET(req: Request) {
  const session = await auth()

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)

  const page = Math.max(
    parseInt(searchParams.get('page') || '1', 10),
    1
  )

  const pageSize = Math.min(
    Math.max(
      parseInt(searchParams.get('pageSize') || '20', 10),
      1
    ),
    100
  )

  const skip = (page - 1) * pageSize

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),

    prisma.auditLog.count(),
  ])

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      meta: log.meta,
      actor: log.actor,
      createdAt: log.createdAt,
    })),
  })
}

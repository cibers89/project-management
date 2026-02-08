export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportStatus } from '@prisma/client'

type RouteContext = {
  params: Promise<{
    reportType: string
    reportId: string
  }>
}

/**
 * ======================================================
 * GET — APPROVAL DETAIL (OWNER)
 * (ISOLATED ROUTE — SAFE)
 * ======================================================
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const { reportType, reportId } = await context.params

  if (!['daily', 'weekly', 'monthly'].includes(reportType)) {
    return NextResponse.json(
      { message: 'Invalid report type' },
      { status: 400 }
    )
  }

  const baseInclude = {
    photos: true,
    comments: {
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    },
    project: {
      include: {
        customers: {
          include: {
            customer: {
              select: { name: true, email: true },
            },
          },
        },
      },
    },
    createdBy: {
      select: { name: true, email: true },
    },
  }

  let report: any = null

  if (reportType === 'daily') {
    report = await prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        status: ReportStatus.SUBMITTED,
      },
      include: baseInclude,
    })
  }

  if (reportType === 'weekly') {
    report = await prisma.weeklyReport.findFirst({
      where: {
        id: reportId,
        status: ReportStatus.SUBMITTED,
      },
      include: baseInclude,
    })
  }

  if (reportType === 'monthly') {
    report = await prisma.monthlyReport.findFirst({
      where: {
        id: reportId,
        status: ReportStatus.SUBMITTED,
      },
      include: baseInclude,
    })
  }

  if (!report) {
    return NextResponse.json(
      { message: 'Report not found or not pending approval' },
      { status: 404 }
    )
  }

  return NextResponse.json({ report })
}

/**
 * ======================================================
 * POST — APPROVE / REJECT (OWNER)
 * (ISOLATED ROUTE)
 * ======================================================
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const { reportType, reportId } = await context.params
  const { action, rejectNote } = await req.json()

  if (!['daily', 'weekly', 'monthly'].includes(reportType)) {
    return NextResponse.json(
      { message: 'Invalid report type' },
      { status: 400 }
    )
  }

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { message: 'Invalid action' },
      { status: 400 }
    )
  }

  const data: any = {
    status:
      action === 'approve'
        ? ReportStatus.APPROVED
        : ReportStatus.REJECTED,
  }

  if (action === 'reject') {
    if (!rejectNote || !rejectNote.trim()) {
      return NextResponse.json(
        { message: 'Reject note is required' },
        { status: 400 }
      )
    }
    data.rejectNote = rejectNote
  }

  if (reportType === 'daily') {
    await prisma.dailyReport.update({
      where: { id: reportId },
      data,
    })
  }

  if (reportType === 'weekly') {
    await prisma.weeklyReport.update({
      where: { id: reportId },
      data,
    })
  }

  if (reportType === 'monthly') {
    await prisma.monthlyReport.update({
      where: { id: reportId },
      data,
    })
  }

  return NextResponse.json({ success: true })
}

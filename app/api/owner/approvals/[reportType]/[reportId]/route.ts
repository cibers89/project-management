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
 * GET — fetch detail report for approval
 * ======================================================
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const session = await auth()

  if (!session || !session.user || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { reportType, reportId } = await context.params

  if (!['daily', 'weekly', 'monthly'].includes(reportType)) {
    return NextResponse.json(
      { message: 'Invalid report type' },
      { status: 400 }
    )
  }

  const include = {
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
    report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include,
    })
  } else if (reportType === 'weekly') {
    report = await prisma.weeklyReport.findUnique({
      where: { id: reportId },
      include,
    })
  } else {
    report = await prisma.monthlyReport.findUnique({
      where: { id: reportId },
      include,
    })
  }

  if (!report || report.status !== ReportStatus.SUBMITTED) {
    return NextResponse.json(
      { message: 'Report not found or already processed' },
      { status: 404 }
    )
  }

  return NextResponse.json({ report })
}

/**
 * ======================================================
 * POST — approve / reject report
 * ======================================================
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const session = await auth()

  if (!session || !session.user || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
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
    if (!rejectNote) {
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
  } else if (reportType === 'weekly') {
    await prisma.weeklyReport.update({
      where: { id: reportId },
      data,
    })
  } else {
    await prisma.monthlyReport.update({
      where: { id: reportId },
      data,
    })
  }

  return NextResponse.json({ success: true })
}

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put, del } from '@vercel/blob'

/**
 * ======================================================
 * GET — FETCH REJECTED REPORT DETAIL (MANAGER)
 * ======================================================
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const { reportId } = await context.params

  const report = await prisma.dailyReport.findFirst({
    where: {
      id: reportId,
      createdById: session.user.id,
      status: 'REJECTED',
    },
    include: {
      photos: {
        orderBy: { createdAt: 'asc' },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!report) {
    return NextResponse.json(
      { message: 'Report not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ report })
}

/**
 * ======================================================
 * PUT — RESUBMIT REJECTED DAILY REPORT (MANAGER)
 * (UPDATE CAPTION + DELETE BLOB + UPLOAD NEW)
 * ======================================================
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const { reportId } = await context.params
  const formData = await req.formData()

  const content = formData.get('content') as string

  const existingPhotoIds =
    formData.getAll('existingPhotoIds') as string[]
  const existingPhotoCaptions =
    formData.getAll('existingPhotoCaptions') as string[]

  const deletedPhotoIds =
    formData.getAll('deletedPhotoIds') as string[]

  const newPhotos = formData.getAll('photos') as File[]
  const newCaptions = formData.getAll('captions') as string[]

  if (!content || !content.trim()) {
    return NextResponse.json(
      { message: 'Invalid content' },
      { status: 400 }
    )
  }

  /**
   * ======================================================
   * LOAD REPORT (DO NOT LOCK STATUS IN QUERY)
   * ======================================================
   */
  const report = await prisma.dailyReport.findFirst({
    where: {
      id: reportId,
      createdById: session.user.id,
    },
    include: {
      photos: true,
    },
  })

  if (!report) {
    return NextResponse.json(
      { message: 'Report not found' },
      { status: 404 }
    )
  }

  /**
   * ======================================================
   * BUSINESS LOGIC VALIDATION
   * ONLY REJECTED REPORT CAN BE EDITED
   * ======================================================
   */
  if (report.status !== 'REJECTED') {
    return NextResponse.json(
      { message: 'Report is not editable' },
      { status: 400 }
    )
  }

  /**
   * ======================================================
   * UPDATE CORE REPORT
   * ======================================================
   */
  await prisma.dailyReport.update({
    where: { id: report.id },
    data: {
      content,
      status: 'SUBMITTED',
      rejectNote: null,
      reportDate: new Date(),
    },
  })

  /**
   * ======================================================
   * DELETE REMOVED PHOTOS (DB + BLOB)
   * ======================================================
   */
  if (deletedPhotoIds.length > 0) {
    const photosToDelete = report.photos.filter(p =>
      deletedPhotoIds.includes(p.id)
    )

    for (const photo of photosToDelete) {
      await del(photo.url).catch(() => {})
      await prisma.reportPhoto.delete({
        where: { id: photo.id },
      })
    }
  }

  /**
   * ======================================================
   * UPDATE EXISTING PHOTO CAPTIONS
   * ======================================================
   */
  for (let i = 0; i < existingPhotoIds.length; i++) {
    await prisma.reportPhoto.updateMany({
      where: {
        id: existingPhotoIds[i],
        dailyReportId: report.id,
      },
      data: {
        caption: existingPhotoCaptions[i] || '',
      },
    })
  }

  /**
   * ======================================================
   * UPLOAD NEW PHOTOS — VERCEL BLOB
   * ======================================================
   */
  for (let i = 0; i < newPhotos.length; i++) {
    const file = newPhotos[i]
    if (!file || typeof file === 'string') continue

    const blob = await put(
      `projects/${report.projectId}/reports/${report.id}/photos/${Date.now()}-${file.name}`,
      file,
      { access: 'public' }
    )

    await prisma.reportPhoto.create({
      data: {
        dailyReportId: report.id,
        url: blob.url,
        caption: newCaptions[i] || '',
      },
    })
  }

  return NextResponse.json({ success: true })
}

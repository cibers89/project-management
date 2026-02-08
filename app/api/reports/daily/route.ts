export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

/**
 * ======================================================
 * POST — CREATE DAILY REPORT (MANAGER)
 * (VERCEL BLOB — PHOTOS)
 * ======================================================
 */
export async function POST(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const formData = await req.formData()

  const projectId = formData.get('projectId') as string
  const content = formData.get('content') as string

  const photos = formData.getAll('photos') as File[]
  const captions = formData.getAll('captions') as string[]

  // 🔐 VALIDATION
  if (!projectId || !content) {
    return NextResponse.json(
      { message: 'Invalid data' },
      { status: 400 }
    )
  }

  /**
   * =========================
   * CREATE DAILY REPORT
   * =========================
   */
  const report = await prisma.dailyReport.create({
    data: {
      projectId,
      content,
      reportDate: new Date(), // 🔒 SERVER TIMESTAMP
      createdById: session.user.id,
      status: 'SUBMITTED',
    },
  })

  /**
   * =========================
   * UPLOAD PHOTOS — VERCEL BLOB
   * =========================
   */
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    if (!photo || typeof photo === 'string') continue

    const blob = await put(
      `projects/${projectId}/reports/${report.id}/photos/${Date.now()}-${photo.name}`,
      photo,
      { access: 'public' }
    )

    await prisma.reportPhoto.create({
      data: {
        dailyReportId: report.id,
        url: blob.url,
        caption: captions[i] || '',
      },
    })
  }

  return NextResponse.json({ success: true })
}

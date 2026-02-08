export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { put, del } from '@vercel/blob'

/**
 * ======================================================
 * GET — VIEW PROJECT DETAIL (OWNER)
 * (ASLI — TIDAK DIUBAH)
 * ======================================================
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await context.params

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: session.user.id,
    },
    include: {
      manager: {
        select: { id: true, name: true, email: true },
      },
      customers: {
        select: {
          customerId: true,
          customer: {
            select: { name: true, email: true },
          },
        },
      },
      files: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          type: true,
          url: true,
          caption: true,
          fileName: true,
        },
      },
      dailyReports: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { name: true, email: true },
          },
          photos: {
            orderBy: { createdAt: 'asc' },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
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
    },
  })

  if (!project) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  let ratingSummary = null

  if (project.isDone && project.ratings.length > 0) {
    const total = project.ratings.reduce((sum, r) => sum + r.rating, 0)

    ratingSummary = {
      average: total / project.ratings.length,
      count: project.ratings.length,
      feedbacks: project.ratings
        .filter(r => r.feedback)
        .map(r => ({
          id: r.id,
          rating: r.rating,
          feedback: r.feedback,
          customerName: r.customer.name || r.customer.email,
        })),
    }
  }

  return NextResponse.json({
    project: {
      ...project,
      ratingSummary,
      ratings: undefined,
    },
  })
}

/**
 * ======================================================
 * PUT — EDIT PROJECT (OWNER)
 * (FINAL — FIX DELETE + UPLOAD STUCK)
 * ======================================================
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await context.params
  const formData = await req.formData()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const managerId = formData.get('managerId') as string
  const customerIds = formData.getAll('customerIds') as string[]

  const images = formData.getAll('images') as File[]
  const imageCaptions = formData.getAll('imageCaptions') as string[]

  const files = formData.getAll('files') as File[]
  const fileCaptions = formData.getAll('fileCaptions') as string[]

  const keepImageUrls = formData.getAll('existingImages') as string[]
  const keepFileUrls = formData.getAll('existingFiles') as string[]

  if (!name || !startDate || !endDate || !managerId) {
    return NextResponse.json(
      { message: 'Missing required fields' },
      { status: 400 }
    )
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
  })

  if (!project) {
    return NextResponse.json(
      { message: 'Project not found' },
      { status: 404 }
    )
  }

  /**
   * =========================
   * UPDATE CORE PROJECT
   * =========================
   */
  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      managerId,
      customers: {
        deleteMany: {},
        create: customerIds.map(id => ({ customerId: id })),
      },
    },
  })

  /**
   * =========================
   * LOAD EXISTING FILES
   * =========================
   */
  const existingFiles = await prisma.projectFile.findMany({
    where: { projectId },
  })

  /**
   * =========================
   * DELETE REMOVED FILES (NON-BLOCKING)
   * =========================
   */
  const deleteTasks: Promise<any>[] = []

  for (const f of existingFiles) {
    if (f.type === 'IMAGE' && !keepImageUrls.includes(f.url)) {
      deleteTasks.push(
        del(f.url).catch(() => null).then(() =>
          prisma.projectFile.delete({ where: { id: f.id } })
        )
      )
    }

    if (f.type === 'DOCUMENT' && !keepFileUrls.includes(f.url)) {
      deleteTasks.push(
        del(f.url).catch(() => null).then(() =>
          prisma.projectFile.delete({ where: { id: f.id } })
        )
      )
    }
  }

  await Promise.all(deleteTasks)

  /**
   * =========================
   * UPLOAD NEW IMAGES — BLOB
   * =========================
   */
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (!img || typeof img === 'string') continue

    const blob = await put(
      `projects/${projectId}/images/${Date.now()}-${img.name}`,
      img,
      { access: 'public' }
    )

    await prisma.projectFile.create({
      data: {
        projectId,
        type: 'IMAGE',
        fileName: img.name,
        caption: imageCaptions[i] || '',
        url: blob.url,
      },
    })
  }

  /**
   * =========================
   * UPLOAD NEW FILES — BLOB
   * =========================
   */
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file || typeof file === 'string') continue

    const blob = await put(
      `projects/${projectId}/documents/${Date.now()}-${file.name}`,
      file,
      { access: 'public' }
    )

    await prisma.projectFile.create({
      data: {
        projectId,
        type: 'DOCUMENT',
        fileName: file.name,
        caption: fileCaptions[i] || '',
        url: blob.url,
      },
    })
  }

  /**
   * =========================
   * AUDIT
   * =========================
   */
  logAudit({
    session,
    action: 'UPDATE_PROJECT',
    entity: 'PROJECT',
    entityId: projectId,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}

/**
 * ======================================================
 * PATCH — MARK PROJECT AS DONE (OWNER)
 * (ASLI — TIDAK DIUBAH)
 * ======================================================
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await context.params

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: session.user.id,
    },
    include: {
      dailyReports: true,
    },
  })

  if (!project) {
    return NextResponse.json(
      { message: 'Project not found' },
      { status: 404 }
    )
  }

  if (project.dailyReports.length === 0) {
    return NextResponse.json(
      { message: 'Project has no reports' },
      { status: 400 }
    )
  }

  const allApproved = project.dailyReports.every(
    r => r.status === 'APPROVED'
  )

  if (!allApproved) {
    return NextResponse.json(
      { message: 'All reports must be approved' },
      { status: 400 }
    )
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { isDone: true },
  })

  return NextResponse.json({ success: true })
}

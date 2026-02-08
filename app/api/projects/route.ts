export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { put } from '@vercel/blob'

/**
 * ======================================================
 * GET /api/projects
 * (TIDAK DIUBAH – CONTRACT STABLE)
 * ======================================================
 */
export async function GET() {
  const session = await auth()

  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Unauthenticated' },
      { status: 401 }
    )
  }

  const { id, role } = session.user

  if (role === 'PROJECT_OWNER') {
    const projects = await prisma.project.findMany({
      where: { ownerId: id },
      select: { id: true, name: true },
    })

    const managers = await prisma.user.findMany({
      where: { role: 'PROJECT_MANAGER' },
      select: { id: true, name: true, email: true },
    })

    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({ projects, managers, customers })
  }

  if (role === 'PROJECT_MANAGER') {
    const projects = await prisma.project.findMany({
      where: { managerId: id },
      select: { id: true, name: true },
    })

    return NextResponse.json({ projects })
  }

  return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
}

/**
 * ======================================================
 * POST /api/projects
 * OWNER ONLY — FormData
 * (Vercel Blob + Audit, PRODUCTION SAFE)
 * ======================================================
 */
export async function POST(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 403 }
    )
  }

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

  // 🔐 VALIDATION (TETAP SAMA)
  if (!name || !startDate || !endDate || !managerId) {
    return NextResponse.json(
      {
        message: 'Missing required fields',
        debug: { name, startDate, endDate, managerId },
      },
      { status: 400 }
    )
  }

  /**
   * =========================
   * CREATE PROJECT (PRISMA)
   * =========================
   */
  const project = await prisma.project.create({
    data: {
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ownerId: session.user.id,
      managerId,
      customers: {
        create: customerIds.map(id => ({ customerId: id })),
      },
    },
  })

  /**
   * =========================
   * UPLOAD IMAGES — VERCEL BLOB
   * =========================
   */
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (!img || typeof img === 'string') continue
	
	console.log(
	  'BLOB TOKEN EXISTS:',
	  !!process.env.BLOB_READ_WRITE_TOKEN
	)


    const blob = await put(
      `projects/${project.id}/images/${Date.now()}-${img.name}`,
      img,
      { access: 'public' }
    )

    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        type: 'IMAGE',
        fileName: img.name,
        caption: imageCaptions[i] || '',
        url: blob.url,
      },
    })
  }

  /**
   * =========================
   * UPLOAD FILES — VERCEL BLOB
   * =========================
   */
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file || typeof file === 'string') continue

    const blob = await put(
      `projects/${project.id}/documents/${Date.now()}-${file.name}`,
      file,
      { access: 'public' }
    )

    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        type: 'DOCUMENT',
        fileName: file.name,
        caption: fileCaptions[i] || '',
        url: blob.url,
      },
    })
  }

  /**
   * =========================
   * AUDIT — CREATE PROJECT
   * (BEST EFFORT, NON BLOCKING)
   * =========================
   */
  logAudit({
    session,
    action: 'CREATE_PROJECT',
    entity: 'PROJECT',
    entityId: project.id,
    meta: {
      name,
      managerId,
      customerCount: customerIds.length,
      imageCount: images.length,
      fileCount: files.length,
    },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    projectId: project.id,
  })
}

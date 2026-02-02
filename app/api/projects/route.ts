export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

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

  // 🔐 VALIDATION (INI YANG TADI BIKIN 400)
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
   * CREATE PROJECT
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
   * FILE SYSTEM
   * =========================
   */
  const uploadDir = path.join(process.cwd(), 'public/uploads')
  await fs.mkdir(uploadDir, { recursive: true })

  /**
   * =========================
   * SAVE IMAGES
   * =========================
   */
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (!img || typeof img === 'string') continue

    const buffer = Buffer.from(await img.arrayBuffer())
    const storedName = `${Date.now()}-${img.name}`
    const filePath = path.join(uploadDir, storedName)

    await fs.writeFile(filePath, buffer)

    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        type: 'IMAGE',
        fileName: img.name,
        caption: imageCaptions[i] || '',
        url: `/uploads/${storedName}`,
      },
    })
  }

  /**
   * =========================
   * SAVE FILES
   * =========================
   */
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file || typeof file === 'string') continue

    const buffer = Buffer.from(await file.arrayBuffer())
    const storedName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadDir, storedName)

    await fs.writeFile(filePath, buffer)

    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        type: 'DOCUMENT',
        fileName: file.name,
        caption: fileCaptions[i] || '',
        url: `/uploads/${storedName}`,
      },
    })
  }

  return NextResponse.json({
    success: true,
    projectId: project.id,
  })
}

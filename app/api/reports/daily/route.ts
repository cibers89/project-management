import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

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

  if (!projectId || !content) {
    return NextResponse.json(
      { message: 'Invalid data' },
      { status: 400 }
    )
  }

  const report = await prisma.dailyReport.create({
    data: {
      projectId,
      content,
      reportDate: new Date(), // 🔒 SERVER TIMESTAMP
      createdById: session.user.id,
      status: 'SUBMITTED',
    },
  })

  if (photos.length > 0) {
    const uploadDir = path.join(
      process.cwd(),
      'public/uploads'
    )

    await fs.mkdir(uploadDir, { recursive: true })

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i]
      const buffer = Buffer.from(
        await file.arrayBuffer()
      )

      const filename = `${Date.now()}-${file.name}`
      const filePath = path.join(uploadDir, filename)

      await fs.writeFile(filePath, buffer)

      await prisma.reportPhoto.create({
        data: {
          url: `/uploads/${filename}`,
          caption: captions[i] || '',
          dailyReportId: report.id,
        },
      })
    }
  }

  return NextResponse.json({ success: true })
}

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

/**
 * GET — fetch rejected report detail
 */
export async function GET(
  req: Request,
  // { params }: { params: { reportId: string } } 
  context: { params: Promise<{ reportId: string }> } //diganti dengan params dengan promise untuk await value yang di pass
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  
  const { reportId } = await context.params //deklarasi variable reportId yang hasil await diatas

  const report = await prisma.dailyReport.findFirst({
    where: {
      // id: params.reportId,
	  id: reportId,
      createdById: session.user.id,
      status: 'REJECTED',
    },
    include: {
      photos: true,
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
 * PUT — resubmit rejected report
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { reportId } = await context.params

  const formData = await req.formData()
  const content = formData.get('content') as string

  const newPhotos = formData.getAll('photos') as File[]
  const captions = formData.getAll('captions') as string[]

  if (!content) {
    return NextResponse.json(
      { message: 'Invalid content' },
      { status: 400 }
    )
  }

  const report = await prisma.dailyReport.findFirst({
    where: {
      id: reportId,
      createdById: session.user.id,
      status: 'REJECTED',
    },
  })

  if (!report) {
    return NextResponse.json(
      { message: 'Report not found or not editable' },
      { status: 404 }
    )
  }

  // update report
  await prisma.dailyReport.update({
    where: { id: report.id },
    data: {
      content,
      status: 'SUBMITTED',
      rejectNote: null,
      reportDate: new Date(), // 🔒 resubmission timestamp
    },
  })

  // save new photos (old photos stay for audit)
  if (newPhotos.length > 0) {
    const uploadDir = path.join(process.cwd(), 'public/uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    for (let i = 0; i < newPhotos.length; i++) {
      const file = newPhotos[i]
      const buffer = Buffer.from(await file.arrayBuffer())
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

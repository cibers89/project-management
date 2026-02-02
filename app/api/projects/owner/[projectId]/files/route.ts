export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'PROJECT_OWNER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await context.params
  const { url } = await req.json()

  if (!url) {
    return NextResponse.json(
      { message: 'File url is required' },
      { status: 400 }
    )
  }

  /**
   * 1️⃣ Cari file di DB
   */
  const file = await prisma.projectFile.findFirst({
    where: {
      projectId,
      url,
      project: {
        ownerId: session.user.id,
      },
    },
  })

  if (!file) {
    return NextResponse.json(
      { message: 'File not found' },
      { status: 404 }
    )
  }

  /**
   * 2️⃣ Hapus record DB
   */
  await prisma.projectFile.delete({
    where: { id: file.id },
  })

  /**
   * 3️⃣ Hapus file fisik (jika ada)
   */
  const filePath = path.join(
    process.cwd(),
    'public',
    url.replace('/uploads/', 'uploads/')
  )

  try {
    await fs.unlink(filePath)
  } catch (err) {
    // ❗ file mungkin sudah tidak ada → tidak fatal
    console.warn('[FILE DELETE WARN]', filePath)
  }

  return NextResponse.json({ success: true })
}

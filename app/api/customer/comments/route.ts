import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { reportId, message } = await req.json()

  await prisma.reportComment.create({
    data: {
      message,
      userId: session.user.id,
      dailyReportId: reportId,
    },
  })

  return NextResponse.json({ success: true })
}

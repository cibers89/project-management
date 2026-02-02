import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()

  if (!session || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const today = new Date()

  const projects = await prisma.projectCustomer.findMany({
    where: { customerId: session.user.id },
    include: { project: true },
  })

  const total = projects.length
  const done = projects.filter(p => p.project.isDone).length
  const overdue = projects.filter(
    p => !p.project.isDone && p.project.endDate < today
  ).length

  return NextResponse.json({
    total,
    done,
    overdue,
  })
}

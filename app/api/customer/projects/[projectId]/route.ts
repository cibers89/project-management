import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * ======================================================
 * GET — VIEW PROJECT DETAIL (CUSTOMER)
 * ======================================================
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await context.params

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      customers: {
        some: { customerId: session.user.id },
      },
    },
    include: {
      files: {
        orderBy: { createdAt: 'asc' },
      },

      dailyReports: {
        where: { status: 'APPROVED' },
        orderBy: { reportDate: 'desc' },
        include: {
          photos: true,
          comments: {
            include: { user: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },

      ratings: {
        where: {
          customerId: session.user.id,
        },
        select: {
          rating: true,
          feedback: true,
        },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const rating = project.ratings[0] ?? null

  return NextResponse.json({
    project: {
      ...project,
      rating,
      ratings: undefined, // jangan expose array
    },
  })
}

/**
 * ======================================================
 * POST — SUBMIT PROJECT RATING (CUSTOMER)
 * ======================================================
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()

  if (!session || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await context.params
  const body = await req.json()

  const ratingValue = Number(body.rating)
  const feedback = body.feedback as string | undefined

  if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
    return NextResponse.json(
      { message: 'Invalid rating value' },
      { status: 400 }
    )
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      customers: {
        some: { customerId: session.user.id },
      },
    },
    select: {
      id: true,
      isDone: true,
    },
  })

  if (!project) {
    return NextResponse.json({ message: 'Project not found' }, { status: 404 })
  }

  if (!project.isDone) {
    return NextResponse.json(
      { message: 'Project is not completed yet' },
      { status: 400 }
    )
  }

  const existingRating = await prisma.projectRating.findFirst({
    where: {
      projectId,
      customerId: session.user.id,
    },
  })

  if (existingRating) {
    return NextResponse.json(
      { message: 'Rating already submitted' },
      { status: 400 }
    )
  }

  await prisma.projectRating.create({
    data: {
      projectId,
      customerId: session.user.id,
      rating: ratingValue,
      feedback: feedback || null,
    },
  })

  return NextResponse.json({ success: true })
}

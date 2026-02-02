import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

/**
 * ======================================================
 * GET — LIST USERS
 * ======================================================
 */
export async function GET() {
  const session = await auth()

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ users })
}

/**
 * ======================================================
 * POST — CREATE USER
 * ======================================================
 */
export async function POST(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { name, email, role } = body

  if (!email || !role) {
    return NextResponse.json(
      { message: 'Email and role are required' },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    return NextResponse.json(
      { message: 'Email already exists' },
      { status: 400 }
    )
  }

  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      role,
    },
  })

  /**
   * ================= AUDIT =================
   */
  await logAudit({
    session,
    action: 'CREATE_USER',
    entity: 'User',
    entityId: user.id,
    meta: {
      email: user.email,
      role: user.role,
    },
  })

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  })
}

/**
 * ======================================================
 * PUT — UPDATE USER
 * ======================================================
 */
export async function PUT(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { userId, name, email, role } = body

  if (!userId || !email || !role) {
    return NextResponse.json(
      { message: 'Missing required fields' },
      { status: 400 }
    )
  }

  if (userId === session.user.id && role !== session.user.role) {
    return NextResponse.json(
      { message: 'Cannot change your own role' },
      { status: 400 }
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!existingUser) {
    return NextResponse.json(
      { message: 'User not found' },
      { status: 404 }
    )
  }

  if (email !== existingUser.email) {
    const emailUsed = await prisma.user.findUnique({
      where: { email },
    })

    if (emailUsed) {
      return NextResponse.json(
        { message: 'Email already in use' },
        { status: 400 }
      )
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role,
    },
  })

  /**
   * ================= AUDIT =================
   */
  await logAudit({
    session,
    action: 'UPDATE_USER',
    entity: 'User',
    entityId: updatedUser.id,
    meta: {
      before: {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
      after: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    },
  })

  return NextResponse.json({ success: true })
}

/**
 * ======================================================
 * DELETE — DELETE USER
 * ======================================================
 */
export async function DELETE(req: Request) {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Forbidden' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { message: 'userId is required' },
      { status: 400 }
    )
  }

  if (userId === session.user.id) {
    return NextResponse.json(
      { message: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return NextResponse.json(
      { message: 'User not found' },
      { status: 404 }
    )
  }

  await prisma.user.delete({
    where: { id: userId },
  })

  /**
   * ================= AUDIT =================
   */
  await logAudit({
    session,
    action: 'DELETE_USER',
    entity: 'User',
    entityId: user.id,
    meta: {
      email: user.email,
      role: user.role,
    },
  })

  return NextResponse.json({ success: true })
}

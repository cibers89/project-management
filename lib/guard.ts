import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { Role } from '@prisma/client'

export async function requireRole(
  roles: Role[]
) {
  const session = await auth()

  if (!session || !session.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Unauthenticated' },
        { status: 401 }
      ),
    }
  }

  if (!roles.includes(session.user.role as Role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    session,
  }
}

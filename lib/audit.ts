import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'
import { Role } from '@prisma/client'

type AuditPayload = {
  session: Session
  action: string
  entity: string
  entityId: string
  meta?: Record<string, any>
}

/**
 * ======================================================
 * AUDIT LOGGER
 * ======================================================
 */
export async function logAudit({
  session,
  action,
  entity,
  entityId,
  meta,
}: AuditPayload) {
  try {
    if (!session?.user?.id || !session.user.role) return

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,

        // ✅ FIX UTAMA: CAST KE ENUM PRISMA
        actorRole: session.user.role as Role,

        action,
        entity,
        entityId,

        ...(meta !== undefined ? { meta } : {}),
      },
    })
  } catch (err) {
    // ❗ audit TIDAK boleh bikin app crash
    console.error('[AUDIT_LOG_ERROR]', err)
  }
}

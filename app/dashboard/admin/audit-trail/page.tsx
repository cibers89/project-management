'use client'

import { useEffect, useMemo, useState } from 'react'
// export const dynamic = 'force-dynamic'

type AuditActor = {
  id: string
  name: string | null
  email: string | null
  role: string
}

type AuditLog = {
  id: string
  action: string
  entity: string
  entityId: string
  meta: any
  actor: AuditActor
  createdAt: string
}

const PAGE_SIZE = 10

export default function AdminAuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  /* ================= FILTER ================= */
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')

  // ⏱ TIME FILTER
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  /* ================= UI ================= */
  const [openId, setOpenId] = useState<string | null>(null)

  const loadLogs = async (pageNum: number) => {
    setLoading(true)

    const res = await fetch(
      `/api/admin/audit-logs?page=${pageNum}&pageSize=${PAGE_SIZE}`
    )
    const data = await res.json()

    setLogs(Array.isArray(data.logs) ? data.logs : [])
    setTotalPages(data.totalPages || 1)
    setLoading(false)
  }

  useEffect(() => {
    loadLogs(page)
  }, [page])

  /* ================= FILTERED DATA ================= */
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const text =
        `${log.actor.name ?? ''} ${log.actor.email ?? ''} ${log.entityId}`
          .toLowerCase()

      if (search && !text.includes(search.toLowerCase())) return false
      if (actionFilter && log.action !== actionFilter) return false
      if (roleFilter && log.actor.role !== roleFilter) return false
      if (entityFilter && log.entity !== entityFilter) return false

      // ⏱ DATE RANGE FILTER
      const logTime = new Date(log.createdAt).getTime()

      if (fromDate) {
        const from = new Date(fromDate)
        from.setHours(0, 0, 0, 0)
        if (logTime < from.getTime()) return false
      }

      if (toDate) {
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        if (logTime > to.getTime()) return false
      }

      return true
    })
  }, [
    logs,
    search,
    actionFilter,
    roleFilter,
    entityFilter,
    fromDate,
    toDate,
  ])

  useEffect(() => {
    setPage(1)
  }, [
    search,
    actionFilter,
    roleFilter,
    entityFilter,
    fromDate,
    toDate,
  ])

  /* ================= UNIQUE OPTIONS ================= */
  const actions = useMemo(
    () => Array.from(new Set(logs.map(l => l.action))),
    [logs]
  )

  const entities = useMemo(
    () => Array.from(new Set(logs.map(l => l.entity))),
    [logs]
  )

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Audit Trail</h1>
        <p className="text-sm text-gray-500">
          System activity logs (read-only)
        </p>
      </div>

      {/* FILTER */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            placeholder="Search actor / entityId..."
            className="border rounded-xl px-3 py-2 text-sm md:col-span-2"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            {entities.map(e => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="PROJECT_OWNER">PROJECT_OWNER</option>
            <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
            <option value="CUSTOMER">CUSTOMER</option>
          </select>

          <input
            type="date"
            className="border rounded-xl px-3 py-2 text-sm"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />

          <input
            type="date"
            className="border rounded-xl px-3 py-2 text-sm"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-sm text-gray-500">
          Loading audit logs...
        </div>
      )}

      {/* EMPTY */}
      {!loading && filteredLogs.length === 0 && (
        <div className="text-sm text-gray-500">
          No audit logs found.
        </div>
      )}

      {/* LIST */}
      <div className="space-y-4">
        {filteredLogs.map(log => {
          const open = openId === log.id

          return (
            <div
              key={log.id}
              className="bg-white rounded-2xl shadow border"
            >
              <button
                onClick={() => setOpenId(open ? null : log.id)}
                className="w-full text-left p-4 flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {log.action}
                  </div>

                  <div className="text-xs text-gray-500">
                    {log.entity} • {log.entityId}
                  </div>

                  <div className="text-xs text-gray-500">
                    {log.actor.name ||
                      log.actor.email}{' '}
                    ({log.actor.role})
                  </div>
                </div>

                <div className="text-xs text-gray-400 text-right">
                  <div>
                    {new Date(log.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </button>

              {/* META */}
              {open && log.meta && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    Meta
                  </div>
                  <pre className="text-xs bg-white border rounded-xl p-3 overflow-x-auto">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${
                page === i + 1
                  ? 'bg-black text-white'
                  : 'border'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

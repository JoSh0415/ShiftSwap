'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SessionData {
  authenticated: boolean
  member?: {
    id: string
    name: string
    email: string
    role: 'MANAGER' | 'STAFF'
  }
  organisationId?: string
}

interface OrgData {
  id: string
  name: string
  joinCode?: string
  memberCount: number
  shiftCount: number
  createdAt?: string
}

interface MemberData {
  id: string
  name: string
  email: string
  role: 'MANAGER' | 'STAFF'
  staffRole?: string
  orgRoles?: { id: string; name: string }[]
  createdAt: string
}

interface ShiftData {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  status: 'POSTED' | 'CLAIMED' | 'APPROVED' | 'DECLINED' | 'CANCELLED'
  reason?: string
  version: number
  requiredRoleId?: string
  requiredRole?: { id: string; name: string }
  originalOwner: { id: string; name: string; staffRole?: string; orgRoles?: { id: string; name: string }[] }
  claimedBy?: { id: string; name: string; staffRole?: string; orgRoles?: { id: string; name: string }[] }
  postedBy: { id: string; name: string }
  claimedAt?: string
  approvedAt?: string
  createdAt: string
}

interface OrgRoleData {
  id: string
  name: string
  memberCount: number
}

interface LogEntry {
  id: string
  action: string
  details?: string
  createdAt: string
  actor: { name: string; role: string }
  shift: {
    title: string
    date: string
    startTime: string
    endTime: string
    originalOwner: { name: string }
  }
}

interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

// ── API helper ─────────────────────────────────────────────────────────────────

async function api<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  return res.json()
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      const res = await api<SessionData>('/api/auth/session')
      if (res.ok && res.data) {
        setSession(res.data)
      } else {
        setSession({ authenticated: false })
      }
    } catch {
      setSession({ authenticated: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkSession() }, [checkSession])

  const logout = useCallback(async () => {
    await api('/api/auth/session', { method: 'POST' })
    setSession({ authenticated: false })
    window.location.href = '/'
  }, [])

  return { session, loading, checkSession, logout }
}

export function useOrg() {
  const [org, setOrg] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrg = useCallback(async () => {
    const res = await api<{ org: OrgData }>('/api/org')
    if (res.ok && res.data) setOrg(res.data.org)
    setLoading(false)
  }, [])

  const regenerateCode = useCallback(async () => {
    const res = await api<{ joinCode: string }>('/api/org', { method: 'POST' })
    if (res.ok && res.data) {
      setOrg((prev) => prev ? { ...prev, joinCode: res.data!.joinCode } : null)
    }
    return res
  }, [])

  useEffect(() => { fetchOrg() }, [fetchOrg])

  return { org, loading, fetchOrg, regenerateCode }
}

export function useMembers() {
  const [members, setMembers] = useState<MemberData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    const res = await api<{ members: MemberData[] }>('/api/members')
    if (res.ok && res.data) setMembers(res.data.members)
    setLoading(false)
  }, [])

  const removeMember = useCallback(async (memberId: string) => {
    const res = await api('/api/members', {
      method: 'DELETE',
      body: JSON.stringify({ memberId }),
    })
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    }
    return res
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  return { members, loading, fetchMembers, removeMember }
}

export function useShifts(pollInterval = 15000) {
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastFetchRef = useRef<number>(0)

  const fetchShifts = useCallback(async () => {
    try {
      const res = await api<{ shifts: ShiftData[] }>('/api/shifts')
      if (res.ok && res.data) {
        setShifts(res.data.shifts)
        setError(null)
        lastFetchRef.current = Date.now()
      }
    } catch {
      setError('Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }, [])

  // Start/stop polling based on page visibility
  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchShifts, pollInterval)
  }, [fetchShifts, pollInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    fetchShifts()
    startPolling()

    // Clear app icon badge on initial load
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {})
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Clear app icon badge when user returns to app
        if ('clearAppBadge' in navigator) {
          (navigator as any).clearAppBadge().catch(() => {})
        }
        // If tab was hidden for more than 5s, refetch immediately
        if (Date.now() - lastFetchRef.current > 5000) {
          fetchShifts()
        }
        startPolling()
      } else {
        stopPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchShifts, startPolling, stopPolling])

  const postShift = useCallback(async (data: {
    title: string
    date: string
    startTime: string
    endTime: string
    reason?: string
    originalOwnerId: string
    requiredRoleId?: string
  }) => {
    const res = await api<{ shift: ShiftData }>('/api/shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (res.ok) await fetchShifts()
    return res
  }, [fetchShifts])

  const claimShift = useCallback(async (shiftId: string, version: number) => {
    const res = await api<{ shift: ShiftData }>('/api/shifts', {
      method: 'PATCH',
      body: JSON.stringify({ shiftId, action: 'CLAIM', version }),
    })
    if (res.ok) await fetchShifts()
    return res
  }, [fetchShifts])

  const approveShift = useCallback(async (shiftId: string, version: number) => {
    const res = await api<{ shift: ShiftData }>('/api/shifts', {
      method: 'PATCH',
      body: JSON.stringify({ shiftId, action: 'APPROVE', version }),
    })
    if (res.ok) await fetchShifts()
    return res
  }, [fetchShifts])

  const declineShift = useCallback(async (shiftId: string, version: number) => {
    const res = await api<{ shift: ShiftData }>('/api/shifts', {
      method: 'PATCH',
      body: JSON.stringify({ shiftId, action: 'DECLINE', version }),
    })
    if (res.ok) await fetchShifts()
    return res
  }, [fetchShifts])

  const cancelShift = useCallback(async (shiftId: string, version: number) => {
    const res = await api<{ shift: ShiftData }>('/api/shifts', {
      method: 'PATCH',
      body: JSON.stringify({ shiftId, action: 'CANCEL', version }),
    })
    if (res.ok) await fetchShifts()
    return res
  }, [fetchShifts])

  return { shifts, loading, error, fetchShifts, postShift, claimShift, approveShift, declineShift, cancelShift }
}

export function useChangelog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    const res = await api<{ logs: LogEntry[] }>('/api/changelog')
    if (res.ok && res.data) setLogs(res.data.logs)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return { logs, loading, fetchLogs }
}

export function useRoles() {
  const [roles, setRoles] = useState<OrgRoleData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRoles = useCallback(async () => {
    const res = await api<{ roles: OrgRoleData[] }>('/api/roles')
    if (res.ok && res.data) setRoles(res.data.roles)
    setLoading(false)
  }, [])

  const addRole = useCallback(async (name: string) => {
    const res = await api<{ role: OrgRoleData }>('/api/roles', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    if (res.ok) await fetchRoles()
    return res
  }, [fetchRoles])

  const deleteRole = useCallback(async (roleId: string) => {
    const res = await api('/api/roles', {
      method: 'DELETE',
      body: JSON.stringify({ roleId }),
    })
    if (res.ok) await fetchRoles()
    return res
  }, [fetchRoles])

  const updateMyRoles = useCallback(async (roleIds: string[]) => {
    const res = await api('/api/roles', {
      method: 'PATCH',
      body: JSON.stringify({ roleIds }),
    })
    return res
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  return { roles, loading, fetchRoles, addRole, deleteRole, updateMyRoles }
}

export function usePushNotifications(memberId?: string) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  const subscribe = useCallback(async () => {
    if (!supported || !memberId) return

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })

      const res = await api('/api/push', {
        method: 'POST',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (res.ok) setSubscribed(true)
    } catch (err) {
      console.error('Push subscription failed:', err)
    }
  }, [supported, memberId])

  return { supported, subscribed, subscribe }
}

export type { SessionData, OrgData, MemberData, ShiftData, LogEntry, OrgRoleData }
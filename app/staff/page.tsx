'use client'

import { useState, useEffect } from 'react'
import { useSession, useShifts } from '@/app/hooks/useShiftSwap'
import { Navbar, Card, StatusBadge, Spinner, EmptyState, Toast, formatShiftDate, formatShiftDateLong } from '@/app/components/ui'
import { Clock, Hand, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function StaffDashboard() {
  const { session, loading: sessionLoading } = useSession()
  const { shifts, claimShift, cancelShift } = useShifts(4000)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionLoading && (!session?.authenticated || session.member?.role !== 'STAFF')) {
      window.location.href = '/'
    }
  }, [session, sessionLoading])

  if (sessionLoading || !session?.authenticated) return <Spinner />

  const memberId = session.member?.id

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleClaim = async (shiftId: string, version: number) => {
    setActionLoading(shiftId)
    const res = await claimShift(shiftId, version)
    setActionLoading(null)
    if (res.ok) {
      showToast('Shift claimed — waiting for manager approval')
    } else {
      showToast(res.error || 'Failed to claim shift', 'error')
    }
  }

  const handleCancelClaim = async (shiftId: string, version: number) => {
    if (!confirm('Cancel your claim on this shift?')) return
    setActionLoading(shiftId)
    const res = await cancelShift(shiftId, version)
    setActionLoading(null)
    if (res.ok) showToast('Claim cancelled')
    else showToast(res.error || 'Failed to cancel', 'error')
  }

  const availableShifts = shifts.filter(
    (s) => s.status === 'POSTED' && s.originalOwner.id !== memberId
  )
  const myPostedShifts = shifts.filter(
    (s) => s.originalOwner.id === memberId && ['POSTED', 'CLAIMED'].includes(s.status)
  )
  const myClaimedShifts = shifts.filter(
    (s) => s.claimedBy?.id === memberId && s.status === 'CLAIMED'
  )
  const myApprovedShifts = shifts.filter(
    (s) => (s.claimedBy?.id === memberId || s.originalOwner.id === memberId) && s.status === 'APPROVED'
  )

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Welcome back, {session.member?.name}</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Available', value: availableShifts.length, icon: Clock, color: 'text-blue-400' },
            { label: 'My Claims', value: myClaimedShifts.length, icon: Hand, color: 'text-amber-400' },
            { label: 'My Swaps', value: myPostedShifts.length, icon: AlertTriangle, color: 'text-zinc-400' },
            { label: 'Approved', value: myApprovedShifts.length, icon: CheckCircle2, color: 'text-emerald-400' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
              <div className={`flex items-center justify-center gap-1.5 ${stat.color} mb-0.5`}>
                <stat.icon className="h-3.5 w-3.5" />
                <span className="text-xl font-semibold">{stat.value}</span>
              </div>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Notification banner */}
        {myClaimedShifts.length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-200">
                {myClaimedShifts.length} claim{myClaimedShifts.length > 1 ? 's' : ''} awaiting approval
              </p>
              <p className="text-xs text-amber-200/50 mt-0.5">Your manager will review your claims soon</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Available shifts */}
          <section>
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Available Shifts ({availableShifts.length})
            </h2>
            {availableShifts.length > 0 ? (
              <div className="space-y-2">
                {availableShifts.map((shift) => (
                  <Card key={shift.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-zinc-100">{shift.title}</span>
                          <StatusBadge status={shift.status} />
                        </div>
                        <p className="text-sm text-zinc-500">
                          {formatShiftDateLong(shift.date)}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {shift.startTime} – {shift.endTime}
                        </p>
                        <p className="text-sm text-zinc-500 mt-1">
                          Covering for <span className="text-zinc-300">{shift.originalOwner.name}</span>
                          {shift.originalOwner.staffRole && <span className="text-zinc-600"> ({shift.originalOwner.staffRole})</span>}
                        </p>
                        {shift.reason && (
                          <p className="text-xs text-zinc-600 mt-1">Reason: {shift.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleClaim(shift.id, shift.version)}
                        disabled={actionLoading === shift.id}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        {actionLoading === shift.id ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Hand className="h-4 w-4" /> Claim Shift
                          </>
                        )}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="📋"
                title="No available shifts"
                description="When a colleague posts a shift for swap, it'll appear here."
              />
            )}
          </section>

          {/* My posted shifts */}
          {myPostedShifts.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> My Shift Swaps ({myPostedShifts.length})
              </h2>
              <div className="space-y-2">
                {myPostedShifts.map((shift) => (
                  <Card key={shift.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-100">{shift.title}</span>
                      <StatusBadge status={shift.status} />
                    </div>
                    <p className="text-sm text-zinc-500">
                      {formatShiftDate(shift.date)} · {shift.startTime} – {shift.endTime}
                    </p>
                    {shift.status === 'CLAIMED' && shift.claimedBy && (
                      <p className="text-sm text-amber-400 mt-1.5">
                        {shift.claimedBy.name} wants to cover — awaiting manager approval
                      </p>
                    )}
                    {shift.status === 'POSTED' && (
                      <p className="text-sm text-zinc-600 mt-1.5">Waiting for someone to claim</p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Pending claims */}
          {myClaimedShifts.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                <Hand className="h-3.5 w-3.5" /> Pending Claims ({myClaimedShifts.length})
              </h2>
              <div className="space-y-2">
                {myClaimedShifts.map((shift) => (
                  <Card key={shift.id} className="!border-amber-500/15">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-zinc-100">{shift.title}</span>
                          <StatusBadge status={shift.status} />
                        </div>
                        <p className="text-sm text-zinc-500">
                          {formatShiftDate(shift.date)} · {shift.startTime} – {shift.endTime}
                        </p>
                        <p className="text-sm text-zinc-500 mt-1">
                          Covering for {shift.originalOwner.name}
                        </p>
                        <p className="text-xs text-amber-500/60 mt-1">Waiting for manager approval</p>
                      </div>
                      <button
                        onClick={() => handleCancelClaim(shift.id, shift.version)}
                        disabled={actionLoading === shift.id}
                        className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500 hover:text-red-400 hover:border-red-800 transition-colors disabled:opacity-50 shrink-0"
                      >
                        Cancel Claim
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Approved */}
          {myApprovedShifts.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approved ({myApprovedShifts.length})
              </h2>
              <div className="space-y-2">
                {myApprovedShifts.map((shift) => (
                  <Card key={shift.id} className="!border-emerald-500/15">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-100">{shift.title}</span>
                      <StatusBadge status={shift.status} />
                    </div>
                    <p className="text-sm text-zinc-500">
                      {formatShiftDate(shift.date)} · {shift.startTime} – {shift.endTime}
                    </p>
                    {shift.claimedBy?.id === memberId ? (
                      <p className="text-sm text-emerald-400 mt-1.5">
                        You&apos;re covering for {shift.originalOwner.name}
                      </p>
                    ) : (
                      <p className="text-sm text-emerald-400 mt-1.5">
                        {shift.claimedBy?.name} is covering your shift
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

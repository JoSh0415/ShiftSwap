'use client'

import { useState, useEffect } from 'react'
import { useSession, useOrg, useMembers, useShifts, useChangelog } from '@/app/hooks/useShiftSwap'
import { Navbar, Card, StatusBadge, Spinner, EmptyState, Toast, formatShiftDate } from '@/app/components/ui'
import { Copy, Download, RefreshCw, Users, Plus, ClipboardList, History, Check, X, Trash2, Share2 } from 'lucide-react'

type Tab = 'shifts' | 'team' | 'history'

export default function ManagerDashboard() {
  const { session, loading: sessionLoading } = useSession()
  const { org, regenerateCode } = useOrg()
  const { members, fetchMembers, removeMember } = useMembers()
  const { shifts, postShift, approveShift, declineShift, cancelShift, fetchShifts } = useShifts(4000)
  const { logs, fetchLogs } = useChangelog()

  const [tab, setTab] = useState<Tab>('shifts')
  const [showPostForm, setShowPostForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formOwnerId, setFormOwnerId] = useState('')

  useEffect(() => {
    if (!sessionLoading && (!session?.authenticated || session.member?.role !== 'MANAGER')) {
      window.location.href = '/'
    }
  }, [session, sessionLoading])

  if (sessionLoading || !session?.authenticated) return <Spinner />

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handlePostShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formOwnerId) { showToast('Select a staff member', 'error'); return }
    setActionLoading('post')
    const res = await postShift({
      title: formTitle,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      reason: formReason,
      originalOwnerId: formOwnerId,
    })
    setActionLoading(null)
    if (res.ok) {
      showToast('Shift posted successfully')
      setShowPostForm(false)
      setFormTitle(''); setFormDate(''); setFormStartTime(''); setFormEndTime(''); setFormReason(''); setFormOwnerId('')
    } else {
      showToast(res.error || 'Failed to post shift', 'error')
    }
  }

  const handleApprove = async (shiftId: string, version: number) => {
    setActionLoading(shiftId)
    const res = await approveShift(shiftId, version)
    setActionLoading(null)
    if (res.ok) showToast('Shift swap approved')
    else showToast(res.error || 'Failed to approve', 'error')
  }

  const handleDecline = async (shiftId: string, version: number) => {
    setActionLoading(shiftId)
    const res = await declineShift(shiftId, version)
    setActionLoading(null)
    if (res.ok) showToast('Claim declined')
    else showToast(res.error || 'Failed to decline', 'error')
  }

  const handleCancel = async (shiftId: string, version: number) => {
    if (!confirm('Cancel this shift swap?')) return
    setActionLoading(shiftId)
    const res = await cancelShift(shiftId, version)
    setActionLoading(null)
    if (res.ok) showToast('Shift cancelled')
    else showToast(res.error || 'Failed to cancel', 'error')
  }

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from the organisation?`)) return
    const res = await removeMember(memberId)
    if (res.ok) showToast(`${name} removed`)
    else showToast('Failed to remove member', 'error')
  }

  const handleCopyCode = () => {
    if (org?.joinCode) {
      navigator.clipboard.writeText(org.joinCode)
      showToast('Join code copied')
    }
  }

  const handleCopyLink = () => {
    if (org?.joinCode) {
      const link = `${window.location.origin}?code=${org.joinCode}`
      navigator.clipboard.writeText(link)
      showToast('Invite link copied')
    }
  }

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/export?format=${format}`, '_blank')
    showToast(`Exporting as ${format.toUpperCase()}`, 'info')
  }

  const staffMembers = members.filter((m) => m.role === 'STAFF')
  const pendingShifts = shifts.filter((s) => s.status === 'CLAIMED')
  const postedShifts = shifts.filter((s) => s.status === 'POSTED')
  const completedShifts = shifts.filter((s) => ['APPROVED', 'DECLINED', 'CANCELLED'].includes(s.status))

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">{org?.name || 'Organisation'}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{org?.memberCount || 0} members · {shifts.length} shifts</p>
          </div>
          {org?.joinCode && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5">
                <span className="text-xs text-zinc-500">Code</span>
                <span className="font-mono text-sm font-semibold tracking-widest text-zinc-200">{org.joinCode}</span>
              </div>
              <button onClick={handleCopyCode} className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy code">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleCopyLink} className="rounded-md border border-zinc-800 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy invite link">
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Pending alert */}
        {pendingShifts.length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-200">{pendingShifts.length} shift{pendingShifts.length > 1 ? 's' : ''} awaiting approval</p>
              <p className="text-xs text-amber-200/50 mt-0.5">Review and approve or decline below</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-6">
          {([
            ['shifts', 'Shifts', ClipboardList],
            ['team', 'Team', Users],
            ['history', 'History', History],
          ] as [Tab, string, typeof ClipboardList][]).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'history') fetchLogs(); if (t === 'team') fetchMembers(); if (t === 'shifts') fetchShifts() }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-blue-500 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {t === 'shifts' && pendingShifts.length > 0 && (
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {pendingShifts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* === SHIFTS TAB === */}
        {tab === 'shifts' && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" /> Post Shift
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3.5 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200 hover:border-zinc-700"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3.5 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200 hover:border-zinc-700"
              >
                <Download className="h-4 w-4" /> JSON
              </button>
            </div>

            {/* Post form */}
            {showPostForm && (
              <Card>
                <form onSubmit={handlePostShift} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100">Post a Shift for Swap</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">Select who can&apos;t make their shift</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Staff Member">
                      <select
                        value={formOwnerId}
                        onChange={(e) => setFormOwnerId(e.target.value)}
                        required
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-600"
                      >
                        <option value="">Select staff member...</option>
                        {staffMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.staffRole})</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Shift Title">
                      <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Morning Bar" required className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-600" />
                    </FormField>
                    <FormField label="Date">
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-600" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Start">
                        <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} required className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-600" />
                      </FormField>
                      <FormField label="End">
                        <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} required className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-600" />
                      </FormField>
                    </div>
                  </div>

                  <FormField label="Reason (optional)">
                    <input type="text" value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="e.g. Doctor's appointment" className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-600" />
                  </FormField>

                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={actionLoading === 'post'} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                      {actionLoading === 'post' ? 'Posting...' : 'Post Shift'}
                    </button>
                    <button type="button" onClick={() => setShowPostForm(false)} className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">
                      Cancel
                    </button>
                  </div>
                </form>
              </Card>
            )}

            {/* Pending approval */}
            {pendingShifts.length > 0 && (
              <section>
                <SectionLabel>Awaiting Approval</SectionLabel>
                <div className="space-y-2">
                  {pendingShifts.map((shift) => (
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
                            <span className="text-red-400">{shift.originalOwner.name}</span>
                            <span className="text-zinc-600 mx-1.5">→</span>
                            <span className="text-emerald-400">{shift.claimedBy?.name}</span>
                            {shift.claimedBy?.staffRole && <span className="text-zinc-600"> ({shift.claimedBy.staffRole})</span>}
                          </p>
                          {shift.reason && <p className="text-xs text-zinc-600 mt-1">Reason: {shift.reason}</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(shift.id, shift.version)}
                            disabled={actionLoading === shift.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleDecline(shift.id, shift.version)}
                            disabled={actionLoading === shift.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-red-800 hover:text-red-400 disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" /> Decline
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Available for claiming */}
            {postedShifts.length > 0 && (
              <section>
                <SectionLabel>Available for Claiming</SectionLabel>
                <div className="space-y-2">
                  {postedShifts.map((shift) => (
                    <Card key={shift.id}>
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
                            {shift.originalOwner.name} {shift.originalOwner.staffRole && `(${shift.originalOwner.staffRole})`}
                          </p>
                          {shift.reason && <p className="text-xs text-zinc-600 mt-1">Reason: {shift.reason}</p>}
                        </div>
                        <button
                          onClick={() => handleCancel(shift.id, shift.version)}
                          disabled={actionLoading === shift.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500 hover:text-red-400 hover:border-red-800 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Processed */}
            {completedShifts.length > 0 && (
              <section>
                <SectionLabel>Processed</SectionLabel>
                <div className="space-y-2">
                  {completedShifts.map((shift) => (
                    <Card key={shift.id} className="opacity-50">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-zinc-300">{shift.title}</span>
                            <StatusBadge status={shift.status} />
                          </div>
                          <p className="text-sm text-zinc-600">
                            {formatShiftDate(shift.date)} · {shift.startTime} – {shift.endTime}
                          </p>
                          <p className="text-sm text-zinc-600 mt-0.5">
                            {shift.originalOwner.name} {shift.claimedBy ? `→ ${shift.claimedBy.name}` : ''}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {shifts.length === 0 && (
              <EmptyState
                icon="📋"
                title="No shifts yet"
                description="Post a shift for swap to get started. Staff will be notified immediately."
              />
            )}
          </div>
        )}

        {/* === TEAM TAB === */}
        {tab === 'team' && (
          <div className="space-y-6">
            <Card>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-zinc-100">Invite Team Members</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Share this code or link with your staff</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 flex-1">
                  <span className="font-mono text-lg font-bold tracking-[0.25em] text-zinc-200">{org?.joinCode}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopyCode} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                    <Copy className="h-4 w-4" /> Code
                  </button>
                  <button onClick={handleCopyLink} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 transition-colors">
                    <Share2 className="h-4 w-4" /> Link
                  </button>
                  <button
                    onClick={async () => { await regenerateCode(); showToast('New join code generated') }}
                    className="inline-flex items-center rounded-md border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Generate new code"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>

            <section>
              <SectionLabel>Team Members ({members.length})</SectionLabel>
              <div className="space-y-1.5">
                {members.map((member) => (
                  <Card key={member.id} className="!py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                          {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{member.name}</p>
                          <p className="text-xs text-zinc-500">
                            {member.email}
                            {member.staffRole && <span className="text-zinc-600"> · {member.staffRole}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={member.role} />
                        {member.role === 'STAFF' && member.id !== session.member?.id && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="text-zinc-700 hover:text-red-400 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {members.length === 0 && (
                <EmptyState icon="👥" title="No team members" description="Share the join code with your staff to get started." />
              )}
            </section>
          </div>
        )}

        {/* === HISTORY TAB === */}
        {tab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Activity Log</SectionLabel>
              <div className="flex gap-2">
                <button onClick={() => handleExport('csv')} className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Download className="h-3 w-3" /> CSV
                </button>
                <button onClick={() => handleExport('json')} className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Download className="h-3 w-3" /> JSON
                </button>
              </div>
            </div>

            {logs.length > 0 ? (
              <div className="space-y-1">
                {logs.map((log) => (
                  <Card key={log.id} className="!py-3 !px-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                        log.action === 'APPROVED' ? 'bg-emerald-500' :
                        log.action === 'DECLINED' ? 'bg-red-500' :
                        log.action === 'CLAIMED' ? 'bg-amber-500' :
                        log.action === 'CANCELLED' ? 'bg-zinc-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300">
                          <span className="font-medium">{log.actor.name}</span>
                          <span className="text-zinc-500">
                            {log.action === 'POSTED' && ' posted a shift for swap'}
                            {log.action === 'CLAIMED' && ' claimed a shift'}
                            {log.action === 'APPROVED' && ' approved a swap'}
                            {log.action === 'DECLINED' && ' declined a claim'}
                            {log.action === 'CANCELLED' && ' cancelled a shift'}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {log.shift.title} · {formatShiftDate(log.shift.date)} · {log.shift.startTime}–{log.shift.endTime}
                        </p>
                      </div>
                      <span className="text-[11px] text-zinc-600 whitespace-nowrap shrink-0">
                        {new Date(log.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon="📜" title="No activity yet" description="Shift swap activity will appear here." />
            )}
          </div>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">{children}</h3>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

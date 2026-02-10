'use client'

import { useState, useEffect } from 'react'
import { useSession, useShifts, useRoles } from '@/app/hooks/useShiftSwap'
import { Navbar, StatusBadge, Spinner, EmptyState, Toast, formatShiftDate, formatShiftDateLong } from '@/app/components/ui'
import { Clock, Hand, CheckCircle2, AlertTriangle, Calendar, User, ArrowRight, X, Briefcase, Tag, Plus, ClipboardList } from 'lucide-react'
import SetupGate from '@/app/components/SetupGate'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'available' | 'my-shifts'

export default function StaffDashboard() {
  const { session, loading: sessionLoading } = useSession()
  const { shifts, claimShift, cancelShift, postShift } = useShifts()
  const { roles } = useRoles()
  const [activeTab, setActiveTab] = useState<Tab>('available')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Post Shift Form State
  const [showPostModal, setShowPostModal] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formRoleId, setFormRoleId] = useState('') // New: Role needed for coverage

  useEffect(() => {
    if (!sessionLoading && (!session?.authenticated || session.member?.role !== 'STAFF')) {
      window.location.href = '/'
    }
  }, [session, sessionLoading])

  if (sessionLoading || !session?.authenticated) return <div className="h-screen flex items-center justify-center bg-zinc-950"><Spinner /></div>

  const memberId = session.member?.id

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handlePostShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session.member?.id) return

    setActionLoading('posting')
    const res = await postShift({
      title: formTitle,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      reason: formReason,
      originalOwnerId: session.member.id,
      requiredRoleId: formRoleId || undefined,
    })
    setActionLoading(null)

    if (res.ok) {
      setShowPostModal(false)
      showToast('Shift posted successfully!')
      // Reset form
      setFormTitle('')
      setFormDate('')
      setFormStartTime('')
      setFormEndTime('')
      setFormReason('')
      setFormRoleId('')
    } else {
      showToast(res.error || 'Failed to post shift', 'error')
    }
  }

  const handleClaim = async (shiftId: string, version: number) => {
    if(!confirm("Are you sure you want to claim this shift?")) return;
    setActionLoading(shiftId)
    const res = await claimShift(shiftId, version)
    setActionLoading(null)
    if (res.ok) showToast('Shift claimed! Waiting for approval.')
    else showToast(res.error || 'Failed to claim shift', 'error')
  }

  const handleCancelClaim = async (shiftId: string, version: number) => {
    if (!confirm('Cancel your claim on this shift?')) return
    setActionLoading(shiftId)
    const res = await cancelShift(shiftId, version)
    setActionLoading(null)
    if (res.ok) showToast('Claim cancelled')
    else showToast(res.error || 'Failed to cancel', 'error')
  }

  // --- Derived Data ---
  const availableShifts = shifts.filter(s => s.status === 'POSTED' && s.originalOwner.id !== memberId)
  const myPendingClaims = shifts.filter(s => s.claimedBy?.id === memberId && s.status === 'CLAIMED')
  const myApprovedShifts = shifts.filter(s => s.claimedBy?.id === memberId && s.status === 'APPROVED')
  const mypostedShifts = shifts.filter(s => s.originalOwner.id === memberId)

  return (
    <SetupGate memberId={session.member?.id}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20 sm:pb-0">
        <Navbar />
        
        <main className="mx-auto max-w-2xl px-4 py-6 space-y-8">
          
          {/* Hero / Welcome */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Staff Dashboard</h1>
              <p className="text-sm text-zinc-500">Hello, {session.member?.name.split(' ')[0]}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowPostModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 bg-green-800 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all border border-green-700 active:scale-95"
              >
                <Plus className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">New Shift</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <StatCard label="Available" labelFull="Available Shifts" value={availableShifts.length} icon={ClipboardList} color="blue" />
            <StatCard label="Pending" labelFull="Pending Claims" value={myPendingClaims.length} icon={Hand} color="amber" />
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-zinc-800 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab === 'available'} onClick={() => setActiveTab('available')} label="Available Shifts" />
              <TabButton active={activeTab === 'my-shifts'} onClick={() => setActiveTab('my-shifts')} label="My Shifts" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* === AVAILABLE SHIFTS FEED === */}
            {activeTab === 'available' && (
              <motion.div 
                key="available"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {availableShifts.length > 0 ? (
                  availableShifts.map((shift) => (
                    <div key={shift.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                {shift.originalOwner.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{shift.originalOwner.name}</p>
                                <p className="text-xs text-zinc-500">{shift.originalOwner.orgRoles && shift.originalOwner.orgRoles.length > 0 ? shift.originalOwner.orgRoles.map(r => r.name).join(', ') : shift.originalOwner.staffRole || 'Staff'}</p>
                              </div>
                           </div>
                           <StatusBadge status="POSTED" />
                        </div>
                        
                        <div className="my-4 pl-2 border-l-2 border-blue-500/30">
                           <h3 className="text-lg font-semibold text-white">{shift.title}</h3>
                           <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatShiftDateLong(shift.date)}</span>
                           </div>
                           <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                              <Clock className="w-4 h-4" />
                              <span>{shift.startTime} – {shift.endTime}</span>
                           </div>
                           {shift.reason && <p className="text-sm text-zinc-500 mt-2 italic">"{shift.reason}"</p>}
                        </div>

                        <button 
                          onClick={() => handleClaim(shift.id, shift.version)}
                          disabled={actionLoading === shift.id}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                          {actionLoading === shift.id ? <Spinner /> : <><Hand className="w-4 h-4" /> Claim Shift</>}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState icon="🎉" title="All caught up!" description="No shifts currently available to claim." />
                )}
              </motion.div>
            )}

            {/* === MY SHIFTS VIEW === */}
            {activeTab === 'my-shifts' && (
              <motion.div 
                 key="myshifts"
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                 className="space-y-8"
              >
                 {/* 1. Pending Claims */}
                 {myPendingClaims.length > 0 && (
                   <section className="space-y-3">
                     <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Pending Approval</h3>
                     {myPendingClaims.map(shift => (
                       <div key={shift.id} className="bg-zinc-900/50 border border-amber-500/20 rounded-xl p-4 flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-zinc-200">{shift.title}</h4>
                            <p className="text-sm text-zinc-500">{formatShiftDate(shift.date)} · {shift.startTime}</p>
                            <p className="text-xs text-amber-500 mt-1">Waiting for manager</p>
                          </div>
                          <button onClick={() => handleCancelClaim(shift.id, shift.version)} className="text-xs text-zinc-500 underline">Cancel</button>
                       </div>
                     ))}
                   </section>
                 )}

                 {/* 2. My Posted Shifts */}
                 {mypostedShifts.length > 0 && (
                   <section className="space-y-3">
                     <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Shifts I'm Swapping</h3>
                     {mypostedShifts.map(shift => (
                       <div key={shift.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                          <div className="flex justify-between mb-2">
                             <h4 className="font-medium text-zinc-200">{shift.title}</h4>
                             <StatusBadge status={shift.status} />
                          </div>
                          <p className="text-sm text-zinc-500">{formatShiftDate(shift.date)}</p>
                          {shift.status === 'CLAIMED' && shift.claimedBy && (
                             <div className="mt-3 bg-zinc-800/50 rounded p-2 text-sm flex items-center gap-2">
                                <span className="font-medium text-white">{shift.claimedBy.name}</span>
                                <span className="text-zinc-500">wants this shift</span>
                             </div>
                          )}
                       </div>
                     ))}
                   </section>
                 )}

                 {/* 3. Approved Swaps */}
                 {myApprovedShifts.length > 0 && (
                   <section className="space-y-3">
                     <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Confirmed Swaps</h3>
                     {myApprovedShifts.map(shift => (
                       <div key={shift.id} className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                             <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-emerald-100">{shift.title}</h4>
                            <p className="text-sm text-emerald-200/60">{formatShiftDate(shift.date)}</p>
                            <p className="text-xs text-emerald-500 mt-0.5">Approved & Updated on Rota</p>
                          </div>
                       </div>
                     ))}
                   </section>
                 )}

                 {myPendingClaims.length === 0 && mypostedShifts.length === 0 && myApprovedShifts.length === 0 && (
                    <EmptyState icon="🤷‍♂️" title="No active shifts" description="You haven't posted or claimed any shifts yet." />
                 )}

              </motion.div>
            )}

          </AnimatePresence>

        </main>
      </div>

       {/* --- POST SHIFT MODAL --- */}
       <AnimatePresence>
          {showPostModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowPostModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 20 }}
                className="relative w-full max-w-[100vw] sm:max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                {/* Mobile drag handle */}
                <div className="sm:hidden flex justify-center pt-2 pb-0">
                  <div className="w-10 h-1 rounded-full bg-zinc-700" />
                </div>
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                  <h3 className="font-semibold text-base sm:text-lg">Post New Shift</h3>
                  <button onClick={() => setShowPostModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handlePostShift} className="overflow-y-auto overflow-x-hidden max-h-[calc(90vh-60px)] overscroll-contain">
                  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-hidden">
                    <div>
                       <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Shift Title</label>
                       <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Bartlett Shift" required className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" />
                    </div>

                    <div className="overflow-hidden">
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Date</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 sm:px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all box-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 overflow-hidden">
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Start</label>
                        <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} required className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 sm:px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all box-border" />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">End</label>
                        <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} required className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 sm:px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all box-border" />
                      </div>
                    </div>
                    
                    <div>
                       <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Reason (Optional)</label>
                       <input type="text" value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="e.g. Sickness" className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" />
                    </div>

                    {/* Role Selection — only staff with this role get notified */}
                    {roles.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase flex items-center gap-1.5">
                          Role Needed
                        </label>
                        <div className="relative">
                          <select
                            value={formRoleId}
                            onChange={(e) => setFormRoleId(e.target.value)}
                            className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white appearance-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 outline-none transition-all"
                          >
                            <option value="">All staff (no role filter)</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-3 sm:top-3.5 pointer-events-none text-zinc-500"><Tag className="w-4 h-4" /></div>
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-1">Only staff with this role will be notified</p>
                      </div>
                    )}

                    <div className="pt-3 sm:pt-4 flex gap-3 pb-safe">
                      <button type="button" onClick={() => setShowPostModal(false)} className="flex-1 h-11 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors border border-zinc-700">Cancel</button>
                      <button type="submit" disabled={actionLoading === 'posting'} className="flex-1 h-11 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-medium transition-colors shadow-lg shadow-white/5 disabled:opacity-70 flex items-center justify-center gap-2">
                         {actionLoading === 'posting' && <div className="w-4 h-4 animate-spin rounded-full border-2 border-zinc-950 border-r-transparent" />}
                         Create Shift
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </SetupGate>
  )
}

// --- Sub Components ---

function StatCard({ label, labelFull, value, icon: Icon, color }: { label: string, labelFull: string, value: number, icon: any, color: 'blue' | 'amber' | 'zinc' }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    zinc: 'bg-zinc-800/50 text-zinc-400 border-zinc-800'
  }

  return (
    <div className={`p-2.5 sm:p-4 rounded-xl border ${colors[color]} flex items-center justify-between gap-2`}>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-70 mb-0.5 sm:mb-1 truncate">
          <span className="sm:hidden">{label}</span>
          <span className="hidden sm:inline">{labelFull}</span>
        </p>
        <p className="text-xl sm:text-2xl font-bold">{value}</p>
      </div>
      <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${color === 'zinc' ? 'bg-zinc-800' : 'bg-white/5'}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {label}
      {active && (
        <motion.div layoutId="staff-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
      )}
    </button>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useSession, useOrg, useMembers, useShifts, useChangelog, useRoles } from '@/app/hooks/useShiftSwap'
import { Navbar, StatusBadge, Spinner, EmptyState, Toast, formatShiftDate } from '@/app/components/ui'
import { Copy, Download, RefreshCw, Users, Plus, ClipboardList, History, Check, X, Trash2, Share2, Calendar, Clock, ArrowRight, AlertCircle, Search, Tag, Briefcase } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SetupGate from '@/app/components/SetupGate'

type Tab = 'shifts' | 'team' | 'history'

export default function ManagerDashboard() {
  const { session, loading: sessionLoading } = useSession()
  const { org, regenerateCode } = useOrg()
  const { members, fetchMembers, removeMember } = useMembers()
  const { shifts, postShift, approveShift, declineShift, cancelShift, fetchShifts } = useShifts()
  const { logs, fetchLogs } = useChangelog()
  const { roles, addRole, deleteRole, fetchRoles } = useRoles()

  const [tab, setTab] = useState<Tab>('shifts')
  const [showPostModal, setShowPostModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formOwnerId, setFormOwnerId] = useState('')
  const [formRoleId, setFormRoleId] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [addingRole, setAddingRole] = useState(false)

  useEffect(() => {
    if (!sessionLoading && (!session?.authenticated || session.member?.role !== 'MANAGER')) {
      window.location.href = '/'
    }
  }, [session, sessionLoading])

  if (sessionLoading || !session?.authenticated) return <div className="h-screen flex items-center justify-center bg-zinc-950"><Spinner /></div>

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // --- Actions ---

  const handlePostShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formOwnerId) { showToast('Select a staff member', 'error'); return }
    setActionLoading('post')
    const res = await postShift({ title: formTitle, date: formDate, startTime: formStartTime, endTime: formEndTime, reason: formReason, originalOwnerId: formOwnerId, requiredRoleId: formRoleId || undefined })
    setActionLoading(null)
    if (res.ok) {
      showToast('Shift posted successfully')
      setShowPostModal(false)
      // Reset form
      setFormTitle(''); setFormDate(''); setFormStartTime(''); setFormEndTime(''); setFormReason(''); setFormOwnerId(''); setFormRoleId('')
    } else {
      showToast(res.error || 'Failed to post shift', 'error')
    }
  }

  const handleAction = async (action: () => Promise<any>, id: string, successMsg: string) => {
    setActionLoading(id)
    const res = await action()
    setActionLoading(null)
    if (res.ok) showToast(successMsg)
    else showToast(res.error || 'Action failed', 'error')
  }

  const handleCopy = async (text: string, id: string) => {
    if (!text) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  // --- Data Derived ---
  const staffMembers = members.filter((m) => m.role === 'STAFF')
  const pendingShifts = shifts.filter((s) => s.status === 'CLAIMED')
  const postedShifts = shifts.filter((s) => s.status === 'POSTED')
  const completedShifts = shifts.filter((s) => ['APPROVED', 'DECLINED', 'CANCELLED'].includes(s.status))

  return (
    <SetupGate memberId={session.member?.id}>
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30">
      <Navbar />
      
      <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        
        {/* Dashboard Header & Stats */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{org?.name}</h1>
              <p className="text-sm text-zinc-500">Manager Dashboard</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 gap-3">
                <span className="text-xs text-zinc-500 uppercase font-medium tracking-wider">Invite Code</span>
                <span className="font-mono text-sm text-white font-bold tracking-widest">{org?.joinCode}</span>
                <div className="h-4 w-px bg-zinc-800" />
                <button onClick={() => handleCopy(org?.joinCode || '', 'code')} className={`transition-colors ${copiedId === 'code' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'}`}>{copiedId === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
              </div>
              <button 
                onClick={() => handleCopy(org?.joinCode || '', 'code')} 
                className={`sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs active:scale-95 transition-all ${
                  copiedId === 'code' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {copiedId === 'code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span className="font-mono font-bold tracking-wider">{copiedId === 'code' ? 'Copied!' : org?.joinCode}</span>
              </button>
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
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatCard label="Pending" labelFull="Pending Approval" value={pendingShifts.length} icon={AlertCircle} color="amber" />
            <StatCard label="Active" labelFull="Active Listings" value={postedShifts.length} icon={ClipboardList} color="blue" />
            <StatCard label="Team" labelFull="Team Members" value={members.length} icon={Users} color="zinc" />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-zinc-800 -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
            <TabButton active={tab === 'shifts'} onClick={() => setTab('shifts')} label="Shift Management" count={pendingShifts.length > 0 ? pendingShifts.length : undefined} />
            <TabButton active={tab === 'team'} onClick={() => { setTab('team'); fetchMembers() }} label="Team Members" />
            <TabButton active={tab === 'history'} onClick={() => { setTab('history'); fetchLogs() }} label="Activity Log" />
          </div>
        </div>

        {/* === SHIFTS VIEW === */}
        {tab === 'shifts' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* Pending Section */}
            {pendingShifts.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Requires Action</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingShifts.map(shift => (
                    <div key={shift.id} className="group relative overflow-hidden bg-zinc-900/50 border border-amber-500/30 rounded-xl p-3.5 sm:p-5 transition-all hover:bg-zinc-900 hover:border-amber-500/50">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                        <Check className="w-24 h-24 text-amber-500 -mt-8 -mr-8" />
                      </div>
                      <div className="relative z-10 flex flex-col h-full justify-between gap-3 sm:gap-4">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                             <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wide">Swap Requested</div>
                             <span className="font-mono text-[11px] sm:text-xs text-zinc-500">{formatShiftDate(shift.date)}</span>
                          </div>
                          <h4 className="text-base sm:text-lg font-semibold text-white">{shift.title}</h4>
                          <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3 text-sm">
                             <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 flex-wrap">
                               <span className="text-zinc-200 font-medium text-sm">{shift.originalOwner.name}</span>
                               <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-600 flex-shrink-0" />
                               <span className="text-emerald-400 font-medium text-sm">{shift.claimedBy?.name}</span>
                             </div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:gap-3">
                          <button 
                            onClick={() => handleAction(() => approveShift(shift.id, shift.version), shift.id, 'Swap Approved')}
                            disabled={actionLoading === shift.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleAction(() => declineShift(shift.id, shift.version), shift.id, 'Swap Declined')}
                            disabled={actionLoading === shift.id}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Available Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Active Listings</h3>
                {postedShifts.length === 0 && <span className="text-xs text-zinc-600">No active shifts</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {postedShifts.map(shift => (
                  <div key={shift.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 sm:p-5 hover:border-zinc-700 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                         <div className="flex items-center gap-1.5 flex-wrap">
                           <StatusBadge status={shift.status} />
                           {shift.requiredRole && (
                             <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                               <Briefcase className="w-2.5 h-2.5" />
                               {shift.requiredRole.name}
                             </span>
                           )}
                         </div>
                         <span className="text-[11px] sm:text-xs text-zinc-500 font-medium bg-zinc-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">{shift.startTime} - {shift.endTime}</span>
                      </div>
                      <h4 className="font-medium text-zinc-200 text-sm sm:text-base">{shift.title}</h4>
                      <p className="text-xs sm:text-sm text-zinc-500 mt-1 flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                        {formatShiftDate(shift.date)}
                      </p>
                      <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-xs text-zinc-500">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                          {shift.originalOwner.name.charAt(0)}
                        </div>
                        Posted by {shift.originalOwner.name}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                       <button 
                          onClick={() => handleAction(() => cancelShift(shift.id, shift.version), shift.id, 'Shift Cancelled')}
                          className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Cancel Listing
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Processed Section */}
            {completedShifts.length > 0 && (
              <section className="space-y-4 pt-8 border-t border-zinc-900">
                 <h3 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">History</h3>
                 <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30 -mx-3 sm:mx-0">
                   <table className="w-full text-left text-sm text-zinc-500 min-w-[480px]">
                     <thead className="bg-zinc-900/50 text-xs uppercase font-medium text-zinc-400">
                       <tr>
                         <th className="px-4 py-3">Date</th>
                         <th className="px-4 py-3">Shift</th>
                         <th className="px-4 py-3">Status</th>
                         <th className="px-4 py-3">Outcome</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-800/50">
                       {completedShifts.map(shift => (
                         <tr key={shift.id} className="hover:bg-zinc-900/50 transition-colors">
                           <td className="px-4 py-3 font-mono text-xs">{formatShiftDate(shift.date)}</td>
                           <td className="px-4 py-3 text-zinc-300">{shift.title}</td>
                           <td className="px-4 py-3"><StatusBadge status={shift.status} /></td>
                           <td className="px-4 py-3 text-xs">
                             {shift.claimedBy ? (
                               <span>{shift.originalOwner.name} <ArrowRight className="w-3 h-3 inline mx-1" /> {shift.claimedBy.name}</span>
                             ) : (
                               <span>Cancelled by Manager</span>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </section>
            )}
          </div>
        )}

        {/* === TEAM VIEW === */}
        {tab === 'team' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
               <div>
                 <h3 className="text-base sm:text-lg font-medium text-zinc-200">Invite new members</h3>
                 <p className="text-xs sm:text-sm text-zinc-500 mt-1">Share this link to let staff join your organisation.</p>
               </div>
               <div className="flex w-full sm:w-auto items-center gap-2">
                 <code className="flex-1 sm:flex-none bg-black border border-zinc-800 rounded px-2 sm:px-3 py-2 text-xs sm:text-sm font-mono text-zinc-300 truncate min-w-0">
                   {typeof window !== 'undefined' ? window.location.origin : ''}?code={org?.joinCode}
                 </code>
                 <button onClick={() => handleCopy(`${window.location.origin}?code=${org?.joinCode}`, 'link')} className={`p-2 rounded transition-colors flex-shrink-0 ${copiedId === 'link' ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}>
                   {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                 </button>
                 <button onClick={regenerateCode} className="p-2 border border-zinc-700 text-zinc-400 rounded hover:text-white transition-colors flex-shrink-0">
                   <RefreshCw className="w-4 h-4" />
                 </button>
               </div>
             </div>

             {/* Role Management */}
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6 space-y-4">
               <div className="flex items-center justify-between">
                 <div>
                   <h3 className="text-base sm:text-lg font-medium text-zinc-200 flex items-center gap-2">
                     <Briefcase className="w-4 h-4 text-purple-400" />
                     Organisation Roles
                   </h3>
                   <p className="text-xs sm:text-sm text-zinc-500 mt-1">Define roles staff can choose from when joining. Used to target shift notifications.</p>
                 </div>
               </div>
               <div className="flex flex-wrap gap-2">
                 {roles.map((role) => (
                   <div key={role.id} className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
                     <span>{role.name}</span>
                     <span className="text-purple-500/50 text-xs">({role.memberCount})</span>
                     <button
                       onClick={async () => {
                         const res = await deleteRole(role.id)
                         if (res.ok) showToast('Role removed')
                         else showToast((res as any).error || 'Failed to remove role', 'error')
                       }}
                       className="ml-1 text-purple-500/30 hover:text-red-400 transition-colors"
                     >
                       <X className="w-3 h-3" />
                     </button>
                   </div>
                 ))}
                 {roles.length === 0 && !addingRole && (
                   <p className="text-xs text-zinc-600">No roles yet. Add roles so staff can be notified for relevant shifts.</p>
                 )}
               </div>
               {addingRole ? (
                 <form
                   onSubmit={async (e) => {
                     e.preventDefault()
                     if (!newRoleName.trim()) return
                     const res = await addRole(newRoleName.trim())
                     if (res.ok) {
                       setNewRoleName('')
                       setAddingRole(false)
                       showToast('Role added')
                     } else {
                       showToast((res as any).error || 'Failed to add role', 'error')
                     }
                   }}
                   className="flex items-center gap-2"
                 >
                   <input
                     type="text"
                     value={newRoleName}
                     onChange={(e) => setNewRoleName(e.target.value)}
                     placeholder="e.g. Bartender, Server, Chef..."
                     autoFocus
                     className="flex-1 h-9 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white placeholder-zinc-600 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 outline-none"
                   />
                   <button type="submit" className="h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors">Add</button>
                   <button type="button" onClick={() => { setAddingRole(false); setNewRoleName('') }} className="h-9 px-3 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-800 transition-colors">Cancel</button>
                 </form>
               ) : (
                 <button
                   onClick={() => setAddingRole(true)}
                   className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                 >
                   <Plus className="w-3.5 h-3.5" />
                   Add Role
                 </button>
               )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {members.map(member => (
                  <div key={member.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4 flex items-center justify-between group hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 flex-shrink-0">
                         {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-200">{member.name}</p>
                        {member.orgRoles && member.orgRoles.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {member.orgRoles.map((r) => (
                              <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {r.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">{member.staffRole || (member.role === 'MANAGER' ? 'Manager' : 'No roles assigned')}</p>
                        )}
                      </div>
                    </div>
                    {member.role === 'STAFF' && (
                      <button 
                        onClick={() => removeMember(member.id)}
                        className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* === HISTORY VIEW === */}
        {tab === 'history' && (
           <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="divide-y divide-zinc-800">
               {logs.map(log => (
                 <div key={log.id} className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:bg-zinc-800/30 transition-colors">
                   <div className="mt-1">
                     <div className={`w-2 h-2 rounded-full ${
                        log.action === 'APPROVED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                        log.action === 'DECLINED' ? 'bg-red-500' :
                        'bg-blue-500'
                     }`} />
                   </div>
                   <div className="flex-1">
                     <p className="text-sm text-zinc-300">
                       <span className="font-semibold text-white">{log.actor.name}</span>
                       <span className="opacity-70 mx-1">
                          {log.action === 'POSTED' && 'posted a shift for swap'}
                          {log.action === 'CLAIMED' && 'requested to cover a shift'}
                          {log.action === 'APPROVED' && 'approved a shift swap'}
                       </span>
                     </p>
                     <p className="text-xs text-zinc-500 mt-1">
                       {log.shift.title} · {formatShiftDate(log.shift.date)}
                     </p>
                   </div>
                   <span className="text-xs text-zinc-600 font-mono">
                     {new Date(log.createdAt).toLocaleDateString()}
                   </span>
                 </div>
               ))}
               {logs.length === 0 && <EmptyState icon="📜" title="No logs found" description="Activity will show up here." />}
             </div>
           </div>
        )}

      </main>

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
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Staff Member</label>
                    <div className="relative">
                      <select
                        value={formOwnerId}
                        onChange={(e) => setFormOwnerId(e.target.value)}
                        required
                        className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white appearance-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                      >
                        <option value="">Select staff...</option>
                        {staffMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.orgRoles && m.orgRoles.length > 0 ? m.orgRoles.map(r => r.name).join(', ') : m.staffRole || 'No role'})</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-3 sm:top-3.5 pointer-events-none text-zinc-500"><Search className="w-4 h-4" /></div>
                    </div>
                  </div>

                  <div>
                     <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Shift Title</label>
                     <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Friday Night Bar" required className="w-full h-10 sm:h-11 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" />
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
                    <button type="button" onClick={() => setShowPostModal(false)} className="flex-1 h-10 sm:h-11 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors">Cancel</button>
                    <button type="submit" disabled={actionLoading === 'post'} className="flex-1 h-10 sm:h-11 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50">
                      {actionLoading === 'post' ? 'Posting...' : 'Create Shift'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
    </SetupGate>
  )
}

// --- Sub Components for cleaner JSX ---

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

function TabButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`
        relative pb-3 sm:pb-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
        ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}
      `}
    >
      <div className="flex items-center gap-2">
        {label}
        {count !== undefined && (
          <span className="bg-amber-500 text-zinc-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {active && (
        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
      )}
    </button>
  )
}
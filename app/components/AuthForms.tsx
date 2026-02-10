'use client'

import { useState, useEffect, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react'

type AuthMode = 'login' | 'create-org' | 'join-org'

interface AuthFormsProps {
  initialMode?: AuthMode
  joinCode?: string
}

const tabs: { mode: AuthMode; label: string }[] = [
  { mode: 'login', label: 'Sign In' },
  { mode: 'create-org', label: 'New Org' },
  { mode: 'join-org', label: 'Join' },
]

export function AuthForms({ initialMode = 'login', joinCode: initialJoinCode = '' }: AuthFormsProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form States
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [managerName, setManagerName] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [managerPassword, setManagerPassword] = useState('')
  const [joinCode, setJoinCode] = useState(initialJoinCode)
  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [staffRole, setStaffRole] = useState('')
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  // Fetch available roles when join code changes
  useEffect(() => {
    const fetchRolesForOrg = async (code: string) => {
      if (code.length < 4) {
        setAvailableRoles([])
        return
      }
      setLoadingRoles(true)
      try {
        const res = await fetch(`/api/roles/public?joinCode=${code.toUpperCase()}`)
        const data = await res.json()
        if (data.ok && data.data?.roles) {
          setAvailableRoles(data.data.roles)
        } else {
          setAvailableRoles([])
        }
      } catch {
        setAvailableRoles([])
      } finally {
        setLoadingRoles(false)
      }
    }

    if (mode === 'join-org') {
      const timer = setTimeout(() => fetchRolesForOrg(joinCode), 500)
      return () => clearTimeout(timer)
    }
  }, [joinCode, mode])

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let body: Record<string, unknown> = {}
      if (mode === 'login') {
        body = { action: 'login', email: loginEmail, password: loginPassword }
      } else if (mode === 'create-org') {
        body = { action: 'create-org', orgName, name: managerName, email: managerEmail, password: managerPassword }
      } else if (mode === 'join-org') {
        body = { action: 'join-org', joinCode, name: staffName, email: staffEmail, password: staffPassword, staffRole, selectedRoleIds }
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!data.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      const role = data.data?.member?.role
      window.location.href = role === 'MANAGER' ? '/manager' : '/staff'
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Sleek Segmented Control */}
      <div className="grid grid-cols-3 gap-1 p-1 mb-6 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
        {tabs.map(({ mode: m, label }) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError('') }}
            className={`
              relative text-[13px] font-medium py-1.5 rounded-md transition-all duration-300
              ${mode === m ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}
            `}
          >
            {mode === m && (
              <motion.div
                layoutId="tab-bg"
                className="absolute inset-0 bg-zinc-800 rounded-md shadow-sm border border-zinc-700/50"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:min-h-[280px]" // Fixed min-height prevents layout jumping
          >
            {mode === 'login' && (
              <>
                <div className="mb-2">
                  <h2 className="text-lg font-semibold text-zinc-100">Welcome back</h2>
                  <p className="text-sm text-zinc-500">Enter your details to sign in.</p>
                </div>
                <Input label="Email" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="name@work.com" required />
                <Input label="Password" type="password" value={loginPassword} onChange={setLoginPassword} placeholder="••••••••" required />
              </>
            )}

            {mode === 'create-org' && (
              <>
                <div className="mb-2">
                  <h2 className="text-lg font-semibold text-zinc-100">Create Workspace</h2>
                  <p className="text-sm text-zinc-500">Start a new rota for your team.</p>
                </div>
                <Input label="Organisation Name" value={orgName} onChange={setOrgName} placeholder="e.g. The Coffee House" required />
                <Input label="Your Name" value={managerName} onChange={setManagerName} placeholder="Sarah Smith" required />
                <Input label="Email" type="email" value={managerEmail} onChange={setManagerEmail} placeholder="name@work.com" required />
                <Input label="Password" type="password" value={managerPassword} onChange={setManagerPassword} placeholder="Min 6 chars" minLength={6} required />
              </>
            )}

            {mode === 'join-org' && (
              <>
                <div className="mb-2">
                  <h2 className="text-lg font-semibold text-zinc-100">Join Team</h2>
                  <p className="text-sm text-zinc-500">Enter the invite code from your manager.</p>
                </div>
                <Input
                  label="Invite Code"
                  value={joinCode}
                  onChange={(v: string) => setJoinCode(v.toUpperCase())}
                  placeholder="XY-9999"
                  maxLength={8}
                  className="font-mono tracking-widest text-center uppercase"
                  required
                />
                <Input label="Full Name" value={staffName} onChange={setStaffName} placeholder="John Doe" required />
                <Input label="Email" type="email" value={staffEmail} onChange={setStaffEmail} required />
                <Input label="Password" type="password" value={staffPassword} onChange={setStaffPassword} minLength={6} required />
                
                {/* Role Selection */}
                {availableRoles.length > 0 ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Your Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {availableRoles.map((role) => {
                        const selected = selectedRoleIds.includes(role.id)
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => toggleRole(role.id)}
                            className={`
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                              ${selected
                                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                              }
                            `}
                          >
                            {selected && <Check className="w-3 h-3" />}
                            {role.name}
                          </button>
                        )
                      })}
                    </div>
                    {selectedRoleIds.length === 0 && (
                      <p className="text-[11px] text-zinc-600">Select at least one role</p>
                    )}
                  </div>
                ) : (
                  <Input label="Role" value={staffRole} onChange={setStaffRole} placeholder="e.g. Bartender" required />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="flex items-center gap-2 text-[13px] text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm rounded-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              {mode === 'login' ? 'Sign In' : 'Continue'}
              {!loading && <ArrowRight className="w-4 h-4 opacity-50" />}
            </>
          )}
        </button>
      </form>
    </div>
  )
}

function Input({ label, type = 'text', value, onChange, placeholder, required, minLength, maxLength, className = '' }: any) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        className={`w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all ${className}`}
      />
    </div>
  )
}
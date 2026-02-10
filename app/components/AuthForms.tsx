'use client'

import { useState } from 'react'

type AuthMode = 'login' | 'create-org' | 'join-org'

interface AuthFormsProps {
  initialMode?: AuthMode
  joinCode?: string
}

export function AuthForms({ initialMode = 'login', joinCode: initialJoinCode = '' }: AuthFormsProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let body: Record<string, string> = {}

      if (mode === 'login') {
        body = { action: 'login', email: loginEmail, password: loginPassword }
      } else if (mode === 'create-org') {
        body = {
          action: 'create-org',
          orgName,
          name: managerName,
          email: managerEmail,
          password: managerPassword,
        }
      } else if (mode === 'join-org') {
        body = {
          action: 'join-org',
          joinCode,
          name: staffName,
          email: staffEmail,
          password: staffPassword,
          staffRole,
        }
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
      if (role === 'MANAGER') {
        window.location.href = '/manager'
      } else {
        window.location.href = '/staff'
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const tabs: [AuthMode, string][] = [
    ['login', 'Sign In'],
    ['create-org', 'New Org'],
    ['join-org', 'Join'],
  ]

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-6">
        {tabs.map(([m, label]) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className={`flex-1 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              mode === m
                ? 'border-blue-500 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'login' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Welcome back</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Sign in to your account</p>
            </div>
            <Input label="Email" type="email" value={loginEmail} onChange={setLoginEmail} required />
            <Input label="Password" type="password" value={loginPassword} onChange={setLoginPassword} required />
          </>
        )}

        {mode === 'create-org' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Create Organisation</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Set up your team workspace</p>
            </div>
            <Input label="Organisation Name" value={orgName} onChange={setOrgName} placeholder="e.g. Costa Coffee - Main Street" required />
            <Input label="Your Name" value={managerName} onChange={setManagerName} placeholder="e.g. Sarah Manager" required />
            <Input label="Email" type="email" value={managerEmail} onChange={setManagerEmail} required />
            <Input label="Password" type="password" value={managerPassword} onChange={setManagerPassword} minLength={6} required />
          </>
        )}

        {mode === 'join-org' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Join Organisation</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Enter the code your manager gave you</p>
            </div>
            <Input
              label="Join Code"
              value={joinCode}
              onChange={(v) => setJoinCode(v.toUpperCase())}
              placeholder="e.g. AB3K7X9P"
              maxLength={8}
              className="font-mono tracking-[0.2em] text-center"
              required
            />
            <Input label="Full Name" value={staffName} onChange={setStaffName} placeholder="e.g. Julian Clarke" required />
            <Input label="Email" type="email" value={staffEmail} onChange={setStaffEmail} required />
            <Input label="Password" type="password" value={staffPassword} onChange={setStaffPassword} minLength={6} required />
            <Input label="Role" value={staffRole} onChange={setStaffRole} placeholder="e.g. Barista, Floor Staff" required />
          </>
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </span>
          ) : mode === 'login' ? 'Sign In' : mode === 'create-org' ? 'Create Organisation' : 'Join Organisation'}
        </button>
      </form>
    </div>
  )
}

function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  minLength,
  maxLength,
  className = '',
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  className?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        className={`w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600/50 ${className}`}
      />
    </div>
  )
}

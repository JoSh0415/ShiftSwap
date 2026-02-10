'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, usePushNotifications } from '@/app/hooks/useShiftSwap'
import { Bell, BellOff, LogOut, Menu, X, ArrowLeft, ArrowRightLeft, ChevronDown } from 'lucide-react'
import Link from 'next/link'

// ── Logo ───────────────────────────────────────────────────────────────────────

export function Logo({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizes = {
    sm: { icon: 'h-7 w-7', text: 'text-lg', arrow: 'h-4 w-4' },
    default: { icon: 'h-8 w-8', text: 'text-xl', arrow: 'h-4.5 w-4.5' },
    lg: { icon: 'h-10 w-10', text: 'text-2xl', arrow: 'h-5 w-5' },
  }
  const s = sizes[size]

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${s.icon} inline-flex items-center justify-center rounded-lg bg-blue-600 text-white`}>
        <ArrowRightLeft className={s.arrow} />
      </span>
      <span className={`${s.text} font-semibold tracking-tight text-zinc-100 ml-1`}>
        ShiftSwap
      </span>
    </span>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 1)

  const dims = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'

  return (
    <span
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 font-medium text-zinc-300 ring-1 ring-white/[0.08]`}
    >
      {initials}
    </span>
  )
}

// ── User Dropdown ──────────────────────────────────────────────────────────────

function UserDropdown({
  name,
  email,
  role,
  onLogout,
}: {
  name: string
  email: string
  role: string
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2.5 rounded-lg p-1.5 pr-2.5 transition-colors hover:bg-white/[0.06]"
      >
        <Avatar name={name} />
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 origin-top-right animate-dropdown rounded-xl border border-white/[0.08] bg-zinc-900/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* User info */}
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">{name}</p>
                <p className="truncate text-xs text-zinc-500">{email}</p>
              </div>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                {role}
              </span>
            </div>
          </div>

          <div className="mx-2 my-1 h-px bg-white/[0.06]" />

          {/* Logout */}
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/[0.06] hover:text-red-300 text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// ── Notification Button ────────────────────────────────────────────────────────

function NotificationToggle({
  supported,
  subscribed,
  onSubscribe,
}: {
  supported: boolean
  subscribed: boolean
  onSubscribe: () => void
}) {
  if (!supported) return null

  if (subscribed) {
    return (
      <button
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06]"
        title="Notifications enabled"
      >
        <Bell className="h-[18px] w-[18px] text-zinc-300" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
      </button>
    )
  }

  return (
    <button
      onClick={onSubscribe}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
      title="Enable notifications"
    >
      <BellOff className="h-[18px] w-[18px]" />
      <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-amber-500/80 ring-2 ring-zinc-950" />
    </button>
  )
}

// ── Navbar ──────────────────────────────────────────────────────────────────────

export function Navbar() {
  const { session, logout } = useSession()
  const { supported, subscribed, subscribe } = usePushNotifications(session?.member?.id)
  const [menuOpen, setMenuOpen] = useState(false)

  if (!session?.authenticated) return null

  const isManager = session.member?.role === 'MANAGER'
  const memberName = session.member?.name ?? ''
  const memberEmail = session.member?.email ?? ''
  const memberRole = session.member?.role ?? ''

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left — Logo */}
        <Link href={isManager ? '/manager' : '/staff'} className="flex items-center">
          <Logo />
        </Link>

        {/* Right — Desktop */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <NotificationToggle
            supported={supported}
            subscribed={subscribed}
            onSubscribe={subscribe}
          />

          <div className="mx-2.5 h-6 w-px bg-white/[0.06]" />

          <UserDropdown
            name={memberName}
            email={memberEmail}
            role={memberRole}
            onLogout={logout}
          />
        </div>

        {/* Right — Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] sm:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl transition-all duration-300 ease-out sm:hidden ${
          menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0 border-t-0'
        }`}
      >
        <div className="space-y-1 px-4 py-3">
          {/* User info */}
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <Avatar name={memberName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{memberName}</p>
              <p className="truncate text-xs text-zinc-500">{memberEmail}</p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-700/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              {memberRole}
            </span>
          </div>

          {/* Notifications */}
          {supported && !subscribed && (
            <button
              onClick={() => {
                subscribe()
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/[0.06]"
            >
              <BellOff className="h-4 w-4" />
              Enable notifications
              <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-amber-500/80" />
            </button>
          )}
          {subscribed && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400">
              <Bell className="h-4 w-4" />
              Notifications
              <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          )}

          <div className="mx-2 h-px bg-white/[0.06] hidden" />

          {/* Sign out */}
          <button
            onClick={() => {
              logout()
              setMenuOpen(false)
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.06] hover:text-red-300 text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

// ── Shared Components ───────────────────────────────────────────────────────────

export function BackButton({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300 mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 ${className}`}>
      {children}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    POSTED: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    CLAIMED: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    APPROVED: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    DECLINED: 'bg-red-500/10 text-red-400 ring-red-500/20',
    CANCELLED: 'bg-zinc-500/10 text-zinc-500 ring-zinc-500/20',
    MANAGER: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    STAFF: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${styles[status] || styles.CANCELLED}`}>
      {status}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 py-12 text-center">
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600 max-w-xs">{description}</p>
    </div>
  )
}

export function Toast({ message, type = 'info', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) {
  const styles = {
    success: 'border-emerald-800 bg-emerald-950 text-emerald-300',
    error: 'border-red-800 bg-red-950 text-red-300',
    info: 'border-blue-800 bg-blue-950 text-blue-300',
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-2xl animate-slide-up ${styles[type]}`}>
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="text-current opacity-40 hover:opacity-70 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Formatting ──────────────────────────────────────────────────────────────────

export function formatShiftDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShiftDateLong(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

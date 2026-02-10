'use client'

import { useState } from 'react'
import { useSession, usePushNotifications } from '@/app/hooks/useShiftSwap'
import { Bell, BellOff, LogOut, Menu, X, ArrowLeft, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'

// ── Logo ───────────────────────────────────────────────────────────────────────

export function Logo({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizes = {
    sm: { icon: 'h-5 w-5', text: 'text-base' },
    default: { icon: 'h-6 w-6', text: 'text-lg' },
    lg: { icon: 'h-8 w-8', text: 'text-2xl' },
  }
  const s = sizes[size]

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${s.icon} inline-flex items-center justify-center rounded-lg bg-blue-600 text-white`}>
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </span>
      <span className={`${s.text} font-semibold tracking-tight text-zinc-100`}>
        ShiftSwap
      </span>
    </span>
  )
}

// ── Navbar ──────────────────────────────────────────────────────────────────────

export function Navbar() {
  const { session, logout } = useSession()
  const { supported, subscribed, subscribe } = usePushNotifications(session?.member?.id)
  const [menuOpen, setMenuOpen] = useState(false)

  if (!session?.authenticated) return null

  const isManager = session.member?.role === 'MANAGER'

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href={isManager ? '/manager' : '/staff'} className="flex items-center">
          <Logo size="sm" />
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-4 sm:flex">
          {supported && !subscribed && (
            <button
              onClick={subscribe}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            >
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </button>
          )}
          {subscribed && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
              <BellOff className="h-3.5 w-3.5" />
              Notifications on
            </span>
          )}
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm text-zinc-400">
            {session.member?.name}
          </span>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {session.member?.role}
          </span>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden text-zinc-400">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-zinc-800 px-4 py-3 sm:hidden space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-sm text-zinc-300">{session.member?.name}</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              {session.member?.role}
            </span>
          </div>
          {supported && !subscribed && (
            <button
              onClick={() => { subscribe(); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800/50"
            >
              <Bell className="h-4 w-4" /> Enable Notifications
            </button>
          )}
          {subscribed && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-500">
              <BellOff className="h-4 w-4" /> Notifications on
            </div>
          )}
          <button
            onClick={() => { logout(); setMenuOpen(false) }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-zinc-800/50"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      )}
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
      <span className="text-3xl mb-3 opacity-60">{icon}</span>
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

'use client';

import Link from 'next/link';
import { useShiftSwap } from '../hooks/useShiftSwap';

export default function StaffPage() {
  const { state, acting, needsSubscription, subscribe, sendAction } = useShiftSwap('staff');
  const step = state?.step ?? 'IDLE';

  return (
    <div className="min-h-dvh bg-[var(--background)] flex flex-col font-sans text-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--background)]/80 border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3 active:opacity-70 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Staff</h1>
              <p className="text-[11px] text-gray-500 font-medium">ShiftSwap</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {step === 'POSTED' && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            <div className={`w-2 h-2 rounded-full ${state ? 'bg-emerald-500' : 'bg-gray-600'}`} />
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-5 py-6 max-w-lg mx-auto w-full">
        {/* Notification banner */}
        {needsSubscription && (
          <button
            onClick={subscribe}
            className="w-full mb-5 flex items-center gap-3 p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-400">Enable notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Get alerted when new shifts are posted</p>
            </div>
          </button>
        )}

        {/* ── IDLE ────────────────────────────────────────────────────── */}
        {step === 'IDLE' && (
          <div className="state-enter flex-1 flex flex-col items-center justify-center text-center py-16 w-full">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-300 mb-2">No shifts right now</h2>
            <p className="text-sm text-gray-600 max-w-[240px]">
              We&apos;ll send you a notification the moment something comes in.
            </p>
          </div>
        )}

        {/* ── POSTED — Shift available ────────────────────────────────── */}
        {step === 'POSTED' && (
          <div className="state-enter w-full space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                New shift
              </span>
            </div>

            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
              {/* Shift header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Bar Staff</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Friday evening shift</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-400">£11</span>
                    <span className="text-xs text-gray-500">/hr</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-sm text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Friday
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-sm text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    18:00 – 23:00
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-sm text-gray-300">
                    5 hours
                  </span>
                </div>
              </div>

              {/* Earnings estimate */}
              <div className="mx-6 mb-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Est. earnings</span>
                  <span className="text-base font-bold text-emerald-400">£55.00</span>
                </div>
              </div>

              {/* Claim button */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => sendAction('CLAIM_SHIFT')}
                  disabled={acting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-600/20 active:scale-[0.97] transition-all"
                >
                  Claim this shift
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CLAIMED — Waiting ───────────────────────────────────────── */}
        {step === 'CLAIMED' && (
          <div className="state-enter flex-1 flex flex-col items-center justify-center text-center py-16 w-full">
            <div className="w-16 h-16 rounded-full border-[3px] border-blue-500 border-t-transparent spinner mb-6" />
            <h2 className="text-lg font-bold text-white mb-2">Waiting for approval</h2>
            <p className="text-sm text-gray-500 max-w-[240px]">
              Your manager has been notified. Sit tight — we&apos;ll let you know the moment they respond.
            </p>
          </div>
        )}

        {/* ── APPROVED — Confirmed ────────────────────────────────────── */}
        {step === 'APPROVED' && (
          <div className="state-enter w-full space-y-5">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">You&apos;re confirmed!</h2>
              <p className="text-sm text-gray-500 mb-6">The shift has been added to your schedule</p>

              <div className="bg-black/20 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Role</span>
                  <span className="text-sm text-white font-medium">Bar Staff</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">When</span>
                  <span className="text-sm text-white font-medium">Fri 18:00 – 23:00</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pay</span>
                  <span className="text-sm text-emerald-400 font-bold">£55.00</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useShiftSwap } from '../hooks/useShiftSwap';

// ── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: string }) {
  const steps = [
    { key: 'IDLE', label: 'Post' },
    { key: 'POSTED', label: 'Waiting' },
    { key: 'CLAIMED', label: 'Review' },
    { key: 'APPROVED', label: 'Done' },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center justify-between w-full px-2">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done
                    ? 'bg-blue-500 text-white'
                    : active
                    ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500'
                    : 'bg-white/5 text-gray-600'
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium ${active ? 'text-blue-400' : 'text-gray-600'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-5 transition-colors duration-300 ${done ? 'bg-blue-500' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ManagerPage() {
  const { state, acting, needsSubscription, subscribe, sendAction } = useShiftSwap('manager');
  const step = state?.step ?? 'IDLE';

  return (
    <div className="min-h-dvh bg-[var(--background)] flex flex-col font-sans text-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--background)]/80 border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 active:opacity-70 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">Manager</h1>
                <p className="text-[11px] text-gray-500 font-medium">ShiftSwap</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {step !== 'IDLE' && (
              <button
                onClick={() => sendAction('RESET')}
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                title="Reset"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
            className="w-full mb-5 flex items-center gap-3 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-400">Enable notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Get alerted when staff claim shifts</p>
            </div>
          </button>
        )}

        {/* Progress */}
        <div className="w-full mb-8">
          <StepIndicator step={step} />
        </div>

        {/* State card */}
        <div className="w-full">
          {step === 'IDLE' && (
            <div className="state-enter space-y-5">
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white mb-1">No active shifts</h2>
                <p className="text-sm text-gray-500">Post a shift to get started</p>
              </div>

              <button
                onClick={() => sendAction('POST_SHIFT')}
                disabled={acting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-all"
              >
                Post Shift
              </button>
            </div>
          )}

          {step === 'POSTED' && (
            <div className="state-enter space-y-5">
              <div className="bg-[var(--card)] border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 pulse-ring">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Awaiting claims</h2>
                    <p className="text-xs text-gray-500">Staff have been notified</p>
                  </div>
                </div>

                {/* Shift detail */}
                <div className="bg-black/20 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Role</span>
                    <span className="text-sm text-white font-medium">Bar Staff</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Time</span>
                    <span className="text-sm text-white font-medium">Fri 18:00 – 23:00</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Rate</span>
                    <span className="text-sm text-emerald-400 font-bold">£11.00/hr</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => sendAction('RESET')}
                disabled={acting}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
              >
                Cancel posting
              </button>
            </div>
          )}

          {step === 'CLAIMED' && (
            <div className="state-enter space-y-5">
              <div className="bg-[var(--card)] border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Mike claimed the shift</h2>
                    <p className="text-xs text-gray-500">Approve or decline below</p>
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Applicant</span>
                    <span className="text-sm text-white font-medium">Mike</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Shift</span>
                    <span className="text-sm text-white font-medium">Bar Staff · Fri 18:00</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => sendAction('RESET')}
                  disabled={acting}
                  className="py-3.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
                >
                  Decline
                </button>
                <button
                  onClick={() => sendAction('APPROVE_SHIFT')}
                  disabled={acting}
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 active:scale-[0.97] transition-all"
                >
                  Approve
                </button>
              </div>
            </div>
          )}

          {step === 'APPROVED' && (
            <div className="state-enter space-y-5">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Shift filled</h2>
                <p className="text-sm text-gray-500">Mike is confirmed for Fri 18:00 – 23:00</p>
              </div>

              <button
                onClick={() => sendAction('RESET')}
                disabled={acting}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
              >
                Start new cycle
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

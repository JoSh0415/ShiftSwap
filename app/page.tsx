'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-dvh bg-[var(--background)] flex flex-col font-sans text-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div
          className={`w-full max-w-md space-y-10 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Logo + tagline */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-2 shadow-lg shadow-blue-600/20">
              <svg viewBox="0 0 512 512" className="w-9 h-9">
                <path d="M176,196 L336,196 L306,166 M336,196 L306,226" stroke="white" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M336,316 L176,316 L206,286 M176,316 L206,346" stroke="white" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">ShiftSwap</h1>
            <p className="text-gray-400 text-base max-w-xs mx-auto leading-relaxed">
              Post, claim, and approve shifts in real time with instant push notifications.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid gap-4">
            <Link
              href="/manager"
              className="group relative flex items-center gap-5 p-5 bg-[var(--card)] rounded-2xl border border-[var(--card-border)] hover:border-blue-500/50 transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6M9 14l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">Manager</h2>
                <p className="text-sm text-gray-400 mt-0.5">Post shifts &amp; approve requests</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/staff"
              className="group relative flex items-center gap-5 p-5 bg-[var(--card)] rounded-2xl border border-[var(--card-border)] hover:border-emerald-500/50 transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">Staff</h2>
                <p className="text-sm text-gray-400 mt-0.5">Browse &amp; claim available shifts</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* How-to */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">How it works</h3>
            <div className="space-y-4">
              {[
                { num: '1', text: 'Open Manager view on one device', color: 'text-blue-400' },
                { num: '2', text: 'Open Staff view on another device', color: 'text-emerald-400' },
                { num: '3', text: 'Enable notifications on both', color: 'text-amber-400' },
                { num: '4', text: 'Post a shift → Claim → Approve', color: 'text-purple-400' },
              ].map((s) => (
                <div key={s.num} className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold ${s.color}`}>
                    {s.num}
                  </span>
                  <span className="text-sm text-gray-300 leading-relaxed">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-6 text-center">
        <button
          onClick={async () => {
            await fetch('/api/demo', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ action: 'RESET' }),
            });
            window.location.reload();
          }}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
        >
          Reset demo state
        </button>
      </footer>
    </div>
  );
}

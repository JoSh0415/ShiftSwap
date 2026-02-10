'use client'

import { useEffect } from 'react'
import { useSession } from '@/app/hooks/useShiftSwap'
import { AuthForms } from '@/app/components/AuthForms'
import { Spinner, Logo } from '@/app/components/ui'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Check, ArrowRight } from 'lucide-react'

function HomeContent() {
  const { session, loading } = useSession()
  const searchParams = useSearchParams()
  const joinCode = searchParams.get('code') || ''

  useEffect(() => {
    if (session?.authenticated) {
      if (session.member?.role === 'MANAGER') {
        window.location.href = '/manager'
      } else {
        window.location.href = '/staff'
      }
    }
  }, [session])

  if (loading) return <Spinner />
  if (session?.authenticated) return <Spinner />

  const steps = [
    { num: '01', title: 'Create or join', desc: 'Manager creates the org, staff join with a code.' },
    { num: '02', title: 'Post & claim', desc: "Can't make your shift? Post it. Others claim it instantly." },
    { num: '03', title: 'Approve & go', desc: 'Manager approves the swap. Export for payroll.' },
  ]

  return (
    <div className="relative min-h-dvh">
      {/* ── Background layer ── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-blue-600/[0.06] blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-indigo-600/[0.04] blur-[120px]" />
      </div>

      {/* ── Top bar / Logo ── */}
      <header className="relative z-10 px-6 sm:px-10 lg:px-16 xl:px-24 pt-6 pb-0 lg:pt-8 hidden sm:flex">
        <Logo size='lg' />
      </header>

      <header className="relative z-10 px-6 sm:px-10 lg:px-16 xl:px-24 pt-6 pb-0 lg:pt-8 sm:hidden">
        <Logo size='default' />
      </header>

      {/* ── Main layout ── */}
      <main className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:min-h-[calc(100dvh-80px)] px-6 sm:px-10 lg:px-16 xl:px-24">

        {/* ── Auth Panel — first on mobile, right on desktop ── */}
        <div className="order-1 lg:order-2 w-full lg:w-[440px] xl:w-[560px] shrink-0 pt-8 pb-4 lg:py-0 lg:pl-16 xl:pl-24">
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <AuthForms initialMode={joinCode ? 'join-org' : 'login'} joinCode={joinCode} />
          </div>
        </div>

        {/* ── Horizontal divider (mobile only) ── */}
        <div className="order-2 lg:hidden flex items-center gap-4 py-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-600 font-medium shrink-0">Why ShiftSwap</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        </div>

        {/* ── Hero Panel — second on mobile, left on desktop ── */}
        <div className="order-3 lg:order-1 flex-1 flex flex-col justify-center pb-16 lg:pb-0 lg:pr-16 xl:pr-24">
          <div className="max-w-lg">

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-zinc-50 leading-[1.08]">
              Shift&nbsp;swaps,
              <span className="text-zinc-400">{" "} sorted.</span>
            </h1>

            <p className="mt-5 text-[15px] sm:text-base text-zinc-500 leading-relaxed max-w-md">
              Post shifts, claim coverage, get instant manager approvals.
              Real-time notifications keep your whole team in sync.
            </p>

            {/* Steps */}
            <div className="mt-10 lg:mt-12">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-5">
                How it works
              </h2>
              <div className="space-y-0">
                {steps.map((step, i) => (
                  <div key={step.num} className="relative flex gap-4 pb-6 last:pb-0 group">
                    {i < steps.length - 1 && (
                      <div className="absolute left-[13px] top-7 bottom-0 w-px bg-zinc-800/70" />
                    )}
                    <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-[10px] font-mono font-semibold text-zinc-500 group-hover:border-zinc-700 group-hover:text-zinc-300 transition-colors duration-200">
                      {step.num}
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-sm font-medium text-zinc-200">{step.title}</h3>
                      <p className="mt-0.5 text-[13px] text-zinc-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer badges */}
            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600">
                <Check className="h-3.5 w-3.5 text-emerald-500/70" />
                Free to use
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600">
                <Check className="h-3.5 w-3.5 text-emerald-500/70" />
                No credit card
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600">
                <Check className="h-3.5 w-3.5 text-emerald-500/70" />
                Works on mobile
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<Spinner />}>
      <HomeContent />
    </Suspense>
  )
}

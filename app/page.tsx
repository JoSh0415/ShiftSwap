'use client'

import { useEffect } from 'react'
import { useSession } from '@/app/hooks/useShiftSwap'
import { AuthForms } from '@/app/components/AuthForms'
import { Spinner, Logo } from '@/app/components/ui'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Clock, Users, Shield } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-zinc-800/50">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 h-14">
          <Logo />
          <span className="text-xs text-zinc-600 hidden sm:block">Shift management for teams</span>
        </div>
      </header>

      {/* Hero + Auth */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left — copy */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-16 py-12 lg:py-0">
          <div className="max-w-md">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 leading-tight">
              Shift swaps,<br />sorted.
            </h1>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              Post shifts, claim coverage, get instant manager approvals.
              Real-time notifications keep your whole team in sync.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { icon: Clock, text: 'Real-time shift posting and claiming' },
                { icon: Shield, text: 'Manager approval workflow' },
                { icon: Users, text: 'Team-based with invite codes' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-zinc-500">
                  <Icon className="h-4 w-4 text-zinc-600 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — auth form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 lg:py-0 lg:border-l border-zinc-800/50">
          <div className="w-full max-w-sm">
            <AuthForms initialMode={joinCode ? 'join-org' : 'login'} joinCode={joinCode} />
          </div>
        </div>
      </div>

      {/* Footer steps */}
      <div className="border-t border-zinc-800/50 bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-600 mb-6 text-center">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: '01', title: 'Create or join', desc: 'Manager creates the org, staff join with a code.' },
              { step: '02', title: 'Post & claim', desc: "Can't make your shift? Post it. Others claim it instantly." },
              { step: '03', title: 'Approve & export', desc: 'Manager approves the swap. Export for payroll.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="text-xs font-mono text-zinc-700 mt-0.5">{item.step}</span>
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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

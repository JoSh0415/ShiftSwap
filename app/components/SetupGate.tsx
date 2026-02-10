'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Download, Share, Smartphone, ChevronRight, CheckCircle2, X } from 'lucide-react'

// ── Detection helpers ───────────────────────────────────────────────────────

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false
  // Check display-mode media query (works on all platforms)
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari standalone mode
  if ((navigator as any).standalone === true) return true
  // Android TWA
  if (document.referrer.startsWith('android-app://')) return true
  return false
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// ── SetupGate Component ─────────────────────────────────────────────────────

type SetupStep = 'checking' | 'install-pwa' | 'enable-notifications' | 'ready'

interface SetupGateProps {
  children: ReactNode
  memberId?: string
}

export default function SetupGate({ children, memberId }: SetupGateProps) {
  const [step, setStep] = useState<SetupStep>('checking')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribing, setSubscribing] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check current state on mount
  useEffect(() => {
    // Small delay so the page renders the loading state first
    const timer = setTimeout(() => {
      const mobile = isMobileDevice()
      const pwa = isRunningAsPWA()

      // Step 1: Mobile users not in PWA → install prompt
      if (mobile && !pwa) {
        // Check if they've previously dismissed the install prompt
        const previouslyDismissed = localStorage.getItem('shiftswap-pwa-dismissed')
        if (previouslyDismissed) {
          // They dismissed it, move to notification check
          checkNotifications()
        } else {
          setStep('install-pwa')
        }
        return
      }

      // Step 2: Check notifications
      checkNotifications()
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const checkNotifications = useCallback(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      // Notifications not supported, skip
      setNotificationPermission('unsupported')
      setStep('ready')
      return
    }

    const permission = Notification.permission
    setNotificationPermission(permission)

    if (permission === 'granted') {
      // Already granted — register SW & subscribe silently, then continue
      silentSubscribe()
      setStep('ready')
    } else if (permission === 'denied') {
      // Denied — can't do anything, show info then let through
      setStep('enable-notifications')
    } else {
      // 'default' — need to ask
      setStep('enable-notifications')
    }
  }, [])

  const silentSubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const existingSub = await registration.pushManager.getSubscription()
      const subscription = existingSub || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })

      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
    } catch (err) {
      console.error('Silent push subscribe failed:', err)
    }
  }, [])

  const handleEnableNotifications = async () => {
    setSubscribing(true)
    try {
      // Register service worker first
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Request permission
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (vapidKey) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey,
          })

          await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: subscription.toJSON() }),
          })
        }
        // Small delay for visual feedback then proceed
        setTimeout(() => setStep('ready'), 800)
      }
    } catch (err) {
      console.error('Notification setup failed:', err)
    } finally {
      setSubscribing(false)
    }
  }

  const handleSkipNotifications = () => {
    setStep('ready')
  }

  const handleDismissInstall = () => {
    localStorage.setItem('shiftswap-pwa-dismissed', 'true')
    setDismissed(true)
    checkNotifications()
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (step === 'checking') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (step === 'ready') {
    return <>{children}</>
  }

  // ── Install PWA Screen ─────────────────────────────────────────────────

  if (step === 'install-pwa') {
    const isIOS = isIOSDevice()

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-8"
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-white">Install ShiftSwap</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Add ShiftSwap to your home screen to get instant push notifications and the best experience.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">How to install</p>
            
            {isIOS ? (
              <div className="space-y-3">
                <Step number={1}>
                  Tap the <Share className="w-4 h-4 inline -mt-0.5 text-blue-400" /> <span className="text-white font-medium">Share</span> button at the bottom of your screen
                </Step>
                <Step number={2}>
                  Scroll down and tap <span className="text-white font-medium">&quot;Add to Home Screen&quot;</span>
                </Step>
                <Step number={3}>
                  Tap <span className="text-white font-medium">&quot;Add&quot;</span> in the top right corner
                </Step>
              </div>
            ) : (
              <div className="space-y-3">
                <Step number={1}>
                  Tap the <span className="text-white font-medium">⋮ menu</span> in your browser
                </Step>
                <Step number={2}>
                  Tap <span className="text-white font-medium">&quot;Add to Home screen&quot;</span> or <span className="text-white font-medium">&quot;Install app&quot;</span>
                </Step>
                <Step number={3}>
                  Tap <span className="text-white font-medium">&quot;Install&quot;</span> to confirm
                </Step>
              </div>
            )}
          </div>

          {/* Visual indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
            <Download className="w-3.5 h-3.5" />
            <span>Then re-open ShiftSwap from your home screen</span>
          </div>

          {/* Skip */}
          <button
            onClick={handleDismissInstall}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
          >
            Continue without installing
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Enable Notifications Screen ──────────────────────────────────────────

  if (step === 'enable-notifications') {
    const isDenied = notificationPermission === 'denied'

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-8"
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
              isDenied 
                ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-900/30' 
                : notificationPermission === 'granted'
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-emerald-900/30'
                  : 'bg-gradient-to-br from-amber-600 to-amber-800 shadow-amber-900/30'
            }`}>
              {notificationPermission === 'granted' ? (
                <CheckCircle2 className="w-10 h-10 text-white" />
              ) : (
                <Bell className="w-10 h-10 text-white" />
              )}
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            {isDenied ? (
              <>
                <h1 className="text-2xl font-bold text-white">Notifications Blocked</h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  You&apos;ve previously blocked notifications for ShiftSwap. To enable them, open your browser settings and allow notifications for this site.
                </p>
              </>
            ) : notificationPermission === 'granted' ? (
              <>
                <h1 className="text-2xl font-bold text-white">You&apos;re All Set!</h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Notifications are enabled. You&apos;ll get instant alerts for new shifts, claims, and approvals.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white">Enable Notifications</h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Get instantly notified when shifts are posted, claimed, or approved — even when the app is closed.
                </p>
              </>
            )}
          </div>

          {/* Benefits */}
          {!isDenied && notificationPermission !== 'granted' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-3">
              <Benefit emoji="🔔" text="New shift posted — be first to claim" />
              <Benefit emoji="✅" text="Claim approved or declined instantly" />
              <Benefit emoji="📱" text="Works even when app is closed" />
            </div>
          )}

          {/* Action */}
          {isDenied ? (
            <div className="space-y-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {isIOSDevice() 
                    ? 'Go to Settings → Safari → Notifications → find ShiftSwap → Allow'
                    : 'Tap the 🔒 icon in your browser\'s address bar → Site Settings → Notifications → Allow'
                  }
                </p>
              </div>
              <button
                onClick={handleSkipNotifications}
                className="w-full h-12 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Continue Without Notifications
              </button>
            </div>
          ) : notificationPermission === 'granted' ? (
            <button
              onClick={() => setStep('ready')}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              Continue to Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleEnableNotifications}
                disabled={subscribing}
                className="w-full h-12 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {subscribing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Enable Notifications
                  </>
                )}
              </button>
              <button
                onClick={handleSkipNotifications}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
              >
                Skip for now
              </button>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
        {number}
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>
    </div>
  )
}

function Benefit({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{emoji}</span>
      <p className="text-sm text-zinc-300">{text}</p>
    </div>
  )
}
